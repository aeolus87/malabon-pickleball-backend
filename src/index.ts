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
// import contactRoutes from "./routes/contact.routes";
import connectDB from "./utils/db";
import { IUser } from "./types/express";
import { initSocketService } from "./services/socket.service";
import { ServerToClientEvents, ClientToServerEvents } from "./types/socket.types";

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || "development";
const isDevelopment = NODE_ENV === "development";

// Load environment variables based on NODE_ENV
const envFile = isDevelopment ? ".env.development" : ".env.production";

console.log(`🚀 Starting server in ${NODE_ENV} mode`);
console.log(`📁 Loading environment from ${envFile}`);

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const app = express();
const httpServer = createServer(app);

// Allow larger request bodies for image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Set up Socket.IO with CORS
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
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
  res.status(200).json({ 
    status: "ok", 
    environment: NODE_ENV,
    isDevelopment
  });
});

// Warmup endpoint
app.get("/warmup", (req, res) => {
  res.status(200).json({ 
    status: "ok",
    message: "Server is warm and ready"
  });
});

// CORS middleware
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3000",
  "https://malabonpickleballers.com",
  "https://www.malabonpickleballers.com",
  "https://malabon-pickleball-client.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || isDevelopment) {
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
// app.use("/api/contact", contactRoutes);

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
      message: isDevelopment ? err.message : "An unexpected error occurred",
    });
  }
);

// Database connection
connectDB().then(() => {
  // Always use port 8080 in production for Fly.io compatibility
  const PORT = process.env.NODE_ENV === 'production' ? 8080 : parseInt(process.env.PORT || "5000", 10);
  const HOST = "0.0.0.0"; // Always bind to all network interfaces
  
  httpServer.listen(PORT, HOST, () => {
    console.log(`🌐 Server running in ${NODE_ENV} mode on ${HOST}:${PORT}`);
    console.log(`🔌 Socket.IO server is running`);
    if (isDevelopment) {
      console.log(`📝 Development mode enabled - verbose logging active`);
    }
  });
});

// Export for testing
export { app, io };
