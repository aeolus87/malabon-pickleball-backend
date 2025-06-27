import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";

// Load environment variables based on NODE_ENV if not already loaded
if (!process.env.JWT_SECRET) {
  const envFile =
    process.env.NODE_ENV === "production"
      ? ".env.production"
      : ".env.development";

  dotenv.config({ path: path.resolve(process.cwd(), envFile) });
}

// Make sure JWT_SECRET is properly set in your .env file
const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
  console.log("JWT_SECRET:", process.env.JWT_SECRET);
}

export interface TokenPayload {
  id: string;
}

/**
 * Generate a JWT token for a user
 */
export const generateToken = (userId: string): string => {
  const payload = { id: userId };

  // Get the expiration time from environment or use default
  const expiresIn = process.env.JWT_EXPIRES_IN || "24h";

  try {
    // Using Buffer to properly handle the secret
    const secret = Buffer.from(JWT_SECRET, "utf8");
    // @ts-ignore - TypeScript has issues with jwt.sign overloads
    return jwt.sign(payload, secret, { expiresIn });
  } catch (error) {
    console.error("Error generating JWT token:", error);
    throw new Error("Failed to generate authentication token");
  }
};

/**
 * Verify a JWT token and extract the payload
 */
export const verifyToken = (token: string): TokenPayload => {
  try {
    const secret = Buffer.from(JWT_SECRET, "utf8");
    // @ts-ignore - TypeScript has issues with jwt.verify overloads
    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    console.error("Error verifying JWT token:", error);
    throw new Error("Invalid authentication token");
  }
};
