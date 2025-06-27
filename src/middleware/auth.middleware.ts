import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { IUser } from "../types/express";

interface AuthenticatedRequest extends Request {
  user: IUser;
}

export const getAuthUser = (req: Request): IUser => (req as AuthenticatedRequest).user;

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verify user still exists in database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        error: "User not found", 
        code: "USER_DELETED",
        message: "Your account appears to have been deleted"
      });
    }

    (req as AuthenticatedRequest).user = {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      coverPhoto: user.coverPhoto,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      isProfileComplete: user.isProfileComplete,
      bio: user.bio,
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = getAuthUser(req);
  
  if (!user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  next();
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = getAuthUser(req);
  
  if (!user.isSuperAdmin) {
    return res.status(403).json({ error: "Super admin access required" });
  }
  
  next();
};
