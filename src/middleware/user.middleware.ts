import { Request, Response, NextFunction } from "express";
import { IUser } from "../types/express";
import { validateObjectId } from "../utils/validation";

interface AuthenticatedRequest extends Request {
  user: IUser;
}

export const getUser = (req: Request): IUser => (req as AuthenticatedRequest).user;

export const validateUserId = (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  
  if (!validateObjectId(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }
  
  next();
}; 