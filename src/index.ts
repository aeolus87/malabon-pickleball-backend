import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import authRoutes from "./routes/auth.routes";
import venueRoutes from "./routes/venue.routes";
import clubRoutes from "./routes/club.routes";
import userRoutes from "./routes/user.routes";
import contactRoutes from "./routes/contact.routes";
import connectDB from "./utils/db";
import { IUser } from "./types/express";
import { initSocketService } from "./services/socket.service";

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

console.log(`Loading environment from ${envFile}`);
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const app = express();
const httpServer = createServer(app);

// Allow larger request bodies for image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Set up Socket.IO with CORS
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [
      process.env.CLIENT_URL || "http://localhost:5173",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Increase ping timeout and interval to reduce disconnections
  pingTimeout: 60000,
  pingInterval: 25000,
  // Allow more time for connections to stabilize
  connectTimeout: 30000,
});

// Initialize socket service
initSocketService(io);

// Health check endpoint for monitoring
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", environment: process.env.NODE_ENV });
});

// CORS middleware
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3000",
  "https://malabonpickleballers.com",
  "https://www.malabonpickleballers.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV !== "production"
      ) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contact", contactRoutes);

// Socket.IO authentication middleware
io.use((socket: any, next: any) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: Token not provided"));
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const decoded = jwt.verify(token, jwtSecret) as IUser;
    socket.data.user = decoded;
    next();
  } catch (error) {
    next(new Error("Authentication error: Invalid token"));
  }
});

// Socket.IO connection handling
io.on("connection", (socket: any) => {
  console.log(`User connected: ${socket.id}`);

  // Join a venue room
  socket.on("join:venue", (venueId: string) => {
    socket.join(`venue:${venueId}`);
    console.log(`User ${socket.data.user.id} joined venue: ${venueId}`);
  });

  // Leave a venue room
  socket.on("leave:venue", (venueId: string) => {
    socket.leave(`venue:${venueId}`);
    console.log(`User ${socket.data.user.id} left venue: ${venueId}`);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Default error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Server error:", err);
    res.status(500).json({
      error: "Server error",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : err.message,
    });
  }
);

// Database connection
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(
      `Server running in ${
        process.env.NODE_ENV || "development"
      } mode on port ${PORT}`
    );
    console.log(`Socket.IO server is running`);
  });
});

// Export for testing
export { app, io };
