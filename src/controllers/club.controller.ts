// src/controllers/club.controller.ts
import { Request, Response } from "express";
import { clubService } from "../services/club.service";
import { socketService } from "../services/socket.service";
import { getUser } from "../middleware/club.middleware";

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
      res.status(500).json({ error: "Failed to fetch clubs with member count" });
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
      
      if (!members) {
        return res.status(404).json({ error: "Club not found" });
      }
      
      res.json(members);
    } catch (error) {
      console.error("Failed to fetch club members:", error);
      res.status(500).json({ error: "Failed to fetch club members" });
    }
  },

  async addUserClubs(req: Request, res: Response) {
    try {
      const { clubIds } = req.body;
      const user = getUser(req);

      if (!Array.isArray(clubIds)) {
        return res.status(400).json({ error: "clubIds must be an array" });
      }

      const updatedUser = await clubService.addClubsToUser(user.id, clubIds);

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Emit club membership updates for real-time sync
      if (updatedUser.clubs) {
        updatedUser.clubs.forEach((club: any) => {
          socketService.emitClubUpdate(club);
        });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Failed to add clubs to user:", error);
      res.status(500).json({ error: "Failed to add clubs to user" });
    }
  },

  async joinClub(req: Request, res: Response) {
    try {
      const { clubId } = req.params;
      const user = getUser(req);

      const updatedUser = await clubService.addClubToUser(user.id, clubId);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User or club not found" });
      }
      
      // Emit club update for real-time sync
      if (updatedUser.clubs) {
        const addedClub = updatedUser.clubs.find((club: any) => club._id.toString() === clubId);
        if (addedClub) {
          socketService.emitClubUpdate(addedClub);
        }
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Failed to join club:", error);
      res.status(500).json({ error: "Failed to join club" });
    }
  },

  async leaveClub(req: Request, res: Response) {
    try {
      const { clubId } = req.params;
      const user = getUser(req);

      const updatedUser = await clubService.removeClubFromUser(user.id, clubId);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User or club not found" });
      }
      
      // Emit club update for real-time sync
      socketService.emitClubUpdate({ _id: clubId, memberLeft: user.id });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Failed to leave club:", error);
      res.status(500).json({ error: "Failed to leave club" });
    }
  },

  async getClubWithMembers(req: Request, res: Response) {
    try {
      const { clubId } = req.params;
      const result = await clubService.getClubWithMembers(clubId);

      if (!result) {
        return res.status(404).json({ error: "Club not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Failed to fetch club with members:", error);
      res.status(500).json({ error: "Failed to fetch club with members" });
    }
  },
};
