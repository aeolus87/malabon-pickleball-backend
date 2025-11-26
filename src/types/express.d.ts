import { Document } from "mongoose";
import { UserRole, ICoachProfile } from "../models/user.model";

export interface IUser {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  coverPhoto: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isVerified: boolean;
  bio: string | null;
  role: UserRole;
  coachProfile?: ICoachProfile;
  isPublicProfile: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export interface RequestWithUser extends Express.Request {
  user: IUser;
}
