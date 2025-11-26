// src/models/user.model.ts
import mongoose, { Document, Schema } from "mongoose";

// User roles
export type UserRole = "player" | "coach" | "admin" | "superadmin";

// Coach profile sub-document
export interface ICoachProfile {
  bio?: string;
  specialization?: string;
  isAvailable: boolean;
}

export interface IUser extends Document {
  googleId?: string;
  email: string;
  username?: string;
  passwordHash?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  displayName: string | null;
  photoURL: string | null;
  coverPhoto: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isVerified: boolean;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
  verificationCode?: string | null;
  verificationCodeExpiry?: Date | null;
  bio: string | null;
  clubs: mongoose.Types.ObjectId[];
  // New fields
  role: UserRole;
  coachProfile?: ICoachProfile;
  isPublicProfile: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const coachProfileSchema = new Schema<ICoachProfile>(
  {
    bio: { type: String, default: null },
    specialization: { type: String, default: null },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
  },
  passwordHash: {
    type: String,
    default: null,
    select: false,
  },
  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  phoneNumber: { type: String, default: null },
  displayName: {
    type: String,
    default: null,
  },
  photoURL: {
    type: String,
    default: null,
  },
  coverPhoto: {
    type: String,
    default: null,
  },
  bio: {
    type: String,
    default: null,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  isSuperAdmin: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
    default: null,
    select: false,
  },
  verificationTokenExpiry: {
    type: Date,
    default: null,
  },
  verificationCode: {
    type: String,
    default: null,
    select: false,
  },
  verificationCodeExpiry: {
    type: Date,
    default: null,
  },
  clubs: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Club",
    },
  ],
  // New fields
  role: {
    type: String,
    enum: ["player", "coach", "admin", "superadmin"],
    default: "player",
  },
  coachProfile: {
    type: coachProfileSchema,
    default: null,
  },
  isPublicProfile: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const User = mongoose.model<IUser>("User", userSchema);
