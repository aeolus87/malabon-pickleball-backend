import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        displayName: string | null;
        photoURL: string | null;
        coverPhoto: string | null;
        isAdmin: boolean;
        isSuperAdmin: boolean;
        isProfileComplete: boolean;
        bio: string | null;
      };
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(403).json({ error: "User not found" });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      coverPhoto: user.coverPhoto,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      isProfileComplete: user.isProfileComplete,
      bio: user.bio ?? null,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: "Invalid token" });
    }
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Middleware to require admin privileges
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Admin privileges required" });
  }

  next();
};

// Middleware to require super admin privileges
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ error: "Super admin privileges required" });
  }

  next();
};
