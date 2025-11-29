// src/controllers/user.controller.ts
import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { clubService } from "../services/club.service";
import { getUser } from "../middleware/user.middleware";

export const userController = {
  async updateProfile(req: Request, res: Response) {
    try {
      const user = getUser(req);
      const { displayName, bio, photoURL, coverPhoto } = req.body;

      const updatedProfile = await userService.updateUserProfile(user.id, {
        displayName,
        bio,
        photoURL,
        coverPhoto,
      });

      if (!updatedProfile) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: updatedProfile });
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      // Return validation errors with 400 status
      if (error.message?.includes("Invalid")) {
        return res.status(400).json({ error: error.message });
      }
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const result = await userService.getAllUsers(page, limit);

      res.json({
        users: result.users.map((user) => ({
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          role: user.role || "player",
          createdAt: user.createdAt,
        })),
        pagination: result.pagination,
      });
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

      // Check if target user exists and is not a super admin BEFORE deletion
      const targetUser = await userService.findUserById(userId);
      
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Don't allow deletion of super admins
      if (targetUser.isSuperAdmin) {
        return res.status(403).json({ error: "Cannot delete a super admin account" });
      }

      await userService.deleteUser(userId);

      res.json({ message: "User account deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user account" });
    }
  },

  // ============================================
  // Search and Public Profile Endpoints
  // ============================================

  async searchUsers(req: Request, res: Response) {
    try {
      const { q, limit } = req.query;

      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Search query 'q' is required" });
      }

      const users = await userService.searchUsers(
        q,
        limit ? parseInt(limit as string) : 10
      );

      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  },

  async getPublicProfile(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const profile = await userService.getPublicProfile(userId);

      if (!profile) {
        return res.status(404).json({ error: "User not found" });
      }

      if ("private" in profile) {
        return res.status(403).json({ error: "This profile is private" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error fetching public profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  },

  // ============================================
  // Coach Endpoints
  // ============================================

  async getAllCoaches(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const result = await userService.getAllCoaches(page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching coaches:", error);
      res.status(500).json({ error: "Failed to fetch coaches" });
    }
  },

  async updateCoachProfile(req: Request, res: Response) {
    try {
      const user = getUser(req);
      const { bio, specialization, isAvailable } = req.body;

      // Check if user is a coach
      if (user.role !== "coach") {
        return res.status(403).json({ error: "Only coaches can update coach profile" });
      }

      const updated = await userService.updateCoachProfile(user.id, {
        bio,
        specialization,
        isAvailable,
      });

      if (!updated) {
        return res.status(404).json({ error: "User not found or not a coach" });
      }

      res.json({ user: updated });
    } catch (error) {
      console.error("Error updating coach profile:", error);
      res.status(500).json({ error: "Failed to update coach profile" });
    }
  },

  async setUserRole(req: Request, res: Response) {
    try {
      const currentUser = getUser(req);
      const { userId } = req.params;
      const { role } = req.body;

      const validRoles = ["player", "coach", "admin", "superadmin"];
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      // Only super admins can set admin or superadmin roles
      if ((role === "admin" || role === "superadmin") && !currentUser.isSuperAdmin) {
        return res.status(403).json({ error: "Only super admins can grant admin roles" });
      }

      const updated = await userService.setUserRole(userId, role);

      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        message: "User role updated successfully",
        user: {
          id: updated._id,
          email: updated.email,
          displayName: updated.displayName,
          role: updated.role,
        },
      });
    } catch (error) {
      console.error("Error setting user role:", error);
      res.status(500).json({ error: "Failed to set user role" });
    }
  },
};
