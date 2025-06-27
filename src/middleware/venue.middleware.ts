import { Request, Response, NextFunction } from "express";
import { IUser } from "../types/express";
import { validateObjectId } from "../utils/validation";

interface AuthenticatedRequest extends Request {
  user: IUser;
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  next();
};

export const validateVenueId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  
  if (!validateObjectId(id)) {
    return res.status(400).json({ error: "Invalid venue ID" });
  }
  
  next();
}; 