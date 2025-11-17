// src/models/user.model.ts
import mongoose, { Document, Schema } from "mongoose";

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
  createdAt: Date;
  updatedAt: Date;
}

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
