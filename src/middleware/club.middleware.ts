import { Request, Response, NextFunction } from "express";
import { IUser } from "../types/express";
import { validateObjectId } from "../utils/validation";

interface AuthenticatedRequest extends Request {
  user: IUser;
}

export const getUser = (req: Request): IUser => (req as AuthenticatedRequest).user;

export const validateClubId = (req: Request, res: Response, next: NextFunction) => {
  const { clubId } = req.params;
  
  if (!validateObjectId(clubId)) {
    return res.status(400).json({ error: "Invalid club ID" });
  }
  
  next();
}; 