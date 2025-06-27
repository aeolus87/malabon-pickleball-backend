// src/controllers/user.controller.ts
import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { clubService } from "../services/club.service";
import { getUser } from "../middleware/user.middleware";

export const userController = {
  async updateProfile(req: Request, res: Response) {
    try {
      const user = getUser(req);
      const { displayName, bio, photoURL, coverPhoto, isProfileComplete } = req.body;

      const updatedProfile = await userService.updateUserProfile(user.id, {
        displayName,
        bio,
        photoURL,
        coverPhoto,
        isProfileComplete,
      });

      if (!updatedProfile) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: updatedProfile });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  },

  async getProfile(req: Request, res: Response) {
    try {
      const user = getUser(req);
      const profile = await userService.getUserProfile(user.id);
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  },

  async getUserClubs(req: Request, res: Response) {
    try {
      const user = getUser(req);
      const userClubs = await clubService.getUserClubsWithDetails(user.id);
      res.json(userClubs);
    } catch (error) {
      console.error("Error fetching user clubs:", error);
      res.status(500).json({ error: "Failed to fetch user clubs" });
    }
  },

  // Super admin methods
  async grantAdminPrivileges(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = await userService.grantAdminPrivileges(userId);

      if (!result) {
        return res.status(404).json({ error: "User not found" });
      }

      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        message: "Admin privileges granted successfully",
        user: {
          id: result._id,
          email: result.email,
          displayName: result.displayName,
          isAdmin: result.isAdmin,
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
      const result = await userService.revokeAdminPrivileges(userId);

      if (!result) {
        return res.status(404).json({ error: "User not found" });
      }

      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        message: "Admin privileges revoked successfully",
        user: {
          id: result._id,
          email: result.email,
          displayName: result.displayName,
          isAdmin: result.isAdmin,
        },
      });
    } catch (error) {
      console.error("Error revoking admin privileges:", error);
      res.status(500).json({ error: "Failed to revoke admin privileges" });
    }
  },

  async getAdminUsers(req: Request, res: Response) {
    try {
      const admins = await userService.getAdminUsers();
      
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
      const users = await userService.getAllUsers();

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
      const currentUser = getUser(req);
      const { userId } = req.params;

      // Don't allow users to delete themselves
      if (currentUser.id === userId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      const deletedUser = await userService.deleteUser(userId);

      if (!deletedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Don't allow deletion of super admins
      if (deletedUser.isSuperAdmin) {
        return res.status(403).json({ error: "Cannot delete a super admin account" });
      }

      res.json({ message: "User account deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user account" });
    }
  },
};
