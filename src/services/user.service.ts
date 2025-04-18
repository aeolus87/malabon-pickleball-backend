// src/services/user.service.ts
import { User } from "../models/user.model";
import mongoose from "mongoose";

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  photoURL?: string;
  coverPhoto?: string;
  isProfileComplete?: boolean;
}

export const userService = {
  async updateUserProfile(userId: string, updates: UpdateProfileData) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true }
      );
      return user;
    } catch (error) {
      console.error("Error in updateUserProfile:", error);
      throw error;
    }
  },

  async getUserProfile(userId: string) {
    try {
      const user = await User.findById(userId).populate("clubs");
      return user;
    } catch (error) {
      console.error("Error in getUserProfile:", error);
      throw error;
    }
  },

  async checkUserExists(email: string) {
    try {
      const exists = await User.exists({ email });
      return !!exists;
    } catch (error) {
      throw new Error(
        `Failed to check user existence: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },

  async findUserByEmail(email: string) {
    try {
      return await User.findOne({ email }).select("-password");
    } catch (error) {
      throw new Error(
        `Failed to find user by email: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },

  async findUserById(id: string) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }
      return await User.findById(id).select("-password");
    } catch (error) {
      throw new Error(
        `Failed to find user by ID: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },

  // Methods specific to user management (not auth)
  async updateUserBio(userId: string, bio: string) {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { bio } },
        { new: true }
      ).select("-password");

      return updatedUser;
    } catch (error) {
      throw new Error(
        `Failed to update user bio: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },

  async updateProfileCompletionStatus(userId: string, isComplete: boolean) {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { isProfileComplete: isComplete } },
        { new: true }
      ).select("-password");

      return updatedUser;
    } catch (error) {
      throw new Error(
        `Failed to update profile completion status: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },

  // Create user moved to userService since it's about user data management
  async createUser(userData: {
    email: string;
    displayName?: string;
    photoURL?: string;
    isAdmin?: boolean;
  }) {
    try {
      const newUser = new User({
        ...userData,
        isProfileComplete: false,
      });
      await newUser.save();
      return newUser.toObject();
    } catch (error) {
      throw new Error(
        `Failed to create user: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};
