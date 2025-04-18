// src/controllers/club.controller.ts
import { Request, Response } from "express";
import { clubService } from "../services/club.service";

// Update the AuthenticatedRequest interface to match your user object
interface AuthenticatedRequest extends Request {
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

export const clubController = {
  async getAllClubs(req: Request, res: Response) {
    try {
      const clubs = await clubService.getAllClubs();
      res.json(clubs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clubs" });
    }
  },

  async getClubsWithMemberCount(req: Request, res: Response) {
    try {
      const clubs = await clubService.getClubWithMemberCount();
      res.json(clubs);
    } catch (error) {
      console.error("Failed to fetch clubs with member count:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch clubs with member count" });
    }
  },

  async getClubById(req: Request, res: Response) {
    try {
      const { clubId } = req.params;
      const club = await clubService.getClubById(clubId);

      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }

      res.json(club);
    } catch (error) {
      console.error("Failed to fetch club details:", error);
      res.status(500).json({ error: "Failed to fetch club details" });
    }
  },

  async getClubMembers(req: Request, res: Response) {
    try {
      const { clubId } = req.params;
      const members = await clubService.getClubMembers(clubId);
      res.json(members);
    } catch (error) {
      console.error("Failed to fetch club members:", error);
      res.status(500).json({ error: "Failed to fetch club members" });
    }
  },

  async addUserClubs(req: Request, res: Response) {
    try {
      const { clubIds } = req.body;
      // Use the user from the authenticated request
      const userId = (req as AuthenticatedRequest).user.id;

      if (!Array.isArray(clubIds)) {
        return res.status(400).json({ error: "clubIds must be an array" });
      }

      console.log(`Adding clubs to user ${userId}:`, clubIds);
      const updatedUser = await clubService.addClubsToUser(userId, clubIds);
      console.log("User updated with clubs:", updatedUser);

      // Return the updated user with populated club data
      res.json(updatedUser);
    } catch (error) {
      console.error("Failed to add clubs to user:", error);
      res.status(500).json({ error: "Failed to add clubs to user" });
    }
  },

  async joinClub(req: Request, res: Response) {
    try {
      const { clubId } = req.params;
      const userId = (req as AuthenticatedRequest).user.id;

      if (!clubId) {
        return res.status(400).json({ error: "Club ID is required" });
      }

      const user = await clubService.addClubToUser(userId, clubId);
      res.json(user);
    } catch (error) {
      console.error("Failed to join club:", error);
      res.status(500).json({ error: "Failed to join club" });
    }
  },

  async leaveClub(req: Request, res: Response) {
    try {
      const { clubId } = req.params;
      const userId = (req as AuthenticatedRequest).user.id;

      if (!clubId) {
        return res.status(400).json({ error: "Club ID is required" });
      }

      const user = await clubService.removeClubFromUser(userId, clubId);
      res.json(user);
    } catch (error) {
      console.error("Failed to leave club:", error);
      res.status(500).json({ error: "Failed to leave club" });
    }
  },
};
