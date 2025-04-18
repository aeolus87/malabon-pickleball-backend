import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Select the appropriate MongoDB URI based on environment
    const mongoURI =
      process.env.NODE_ENV === "production"
        ? process.env.MONGODB_URI_PROD
        : process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error(
        `MongoDB URI not defined for ${
          process.env.NODE_ENV || "development"
        } environment`
      );
    }

    console.log(
      `Connecting to MongoDB (${
        process.env.NODE_ENV || "development"
      } environment)`
    );
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Connection event handlers
    mongoose.connection.on("connected", () => {
      console.log("Mongoose connected to DB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("Mongoose disconnected from DB");
    });

    // Handle process termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("Mongoose connection closed through app termination");
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;
