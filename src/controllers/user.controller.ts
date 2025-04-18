// src/controllers/user.controller.ts
import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { clubService } from "../services/club.service";
import { User } from "../models/user.model";
import mongoose from "mongoose";
import { socketService } from "../services/socket.service";

// Make this interface exportable and use Express namespace extension
export interface AuthenticatedRequest extends Request {
  user: {
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

export const userController = {
  async updateProfile(req: Request, res: Response) {
    try {
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { displayName, bio, photoURL, coverPhoto, isProfileComplete } =
        req.body;

      const updatedProfile = await userService.updateUserProfile(user.id, {
        displayName,
        bio,
        photoURL,
        coverPhoto,
        isProfileComplete,
      });

      res.json({ user: updatedProfile });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  },

  async getProfile(req: Request, res: Response) {
    try {
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const profile = await userService.getUserProfile(user.id);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  },

  // Super admin methods
  async grantAdminPrivileges(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.isAdmin) {
        return res
          .status(400)
          .json({ error: "User already has admin privileges" });
      }

      user.isAdmin = true;
      await user.save();

      res.json({
        message: "Admin privileges granted successfully",
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          isAdmin: user.isAdmin,
        },
      });
    } catch (error) {
      console.error("Error granting admin privileges:", error);
      res.status(500).json({ error: "Failed to grant admin privileges" });
    }
  },

  async revokeAdminPrivileges(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.isAdmin) {
        return res
          .status(400)
          .json({ error: "User does not have admin privileges" });
      }

      if (user.isSuperAdmin) {
        return res
          .status(403)
          .json({ error: "Cannot revoke admin privileges from a super admin" });
      }

      user.isAdmin = false;
      await user.save();

      res.json({
        message: "Admin privileges revoked successfully",
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          isAdmin: user.isAdmin,
        },
      });
    } catch (error) {
      console.error("Error revoking admin privileges:", error);
      res.status(500).json({ error: "Failed to revoke admin privileges" });
    }
  },

  async getAdminUsers(req: Request, res: Response) {
    try {
      const admins = await User.find({ isAdmin: true })
        .select("_id email displayName photoURL isAdmin isSuperAdmin")
        .sort({ email: 1 });

      res.json(
        admins.map((admin) => ({
          id: admin._id,
          email: admin.email,
          displayName: admin.displayName,
          photoURL: admin.photoURL,
          isAdmin: admin.isAdmin,
          isSuperAdmin: admin.isSuperAdmin,
        }))
      );
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ error: "Failed to fetch admin users" });
    }
  },

  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await User.find()
        .select("_id email displayName photoURL isAdmin isSuperAdmin createdAt")
        .sort({ email: 1 });

      res.json(
        users.map((user) => ({
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          createdAt: user.createdAt,
        }))
      );
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },

  async deleteUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Prevent deletion of super admin users
      if (user.isSuperAdmin) {
        return res.status(403).json({
          error: "Super admin users cannot be deleted",
        });
      }

      // Delete the user
      await User.findByIdAndDelete(userId);

      // Emit socket event for account deletion - this is more specific than just logout
      socketService.emitUserAccountAction(
        userId,
        "delete",
        "Your account has been deleted"
      );
      // Also emit logout event as a fallback
      socketService.emitUserLogout(userId);

      console.log(`User ${userId} deleted and account deletion events emitted`);

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  },
};
