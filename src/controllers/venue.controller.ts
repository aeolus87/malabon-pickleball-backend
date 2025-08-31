// src/controllers/venue.controller.ts
import { Request, Response } from "express";
import { venueService } from "../services/venue.service";
import { socketService } from "../services/socket.service";
import { IUser } from "../types/express";

interface AuthenticatedRequest extends Request {
  user: IUser;
}

const getUser = (req: Request): IUser => (req as AuthenticatedRequest).user;

export const venueController = {
  async getAllVenues(req: Request, res: Response) {
    try {
      const venues = await venueService.getAllVenues();
      res.json(venues);
    } catch (error) {
      console.error("Error fetching venues:", error);
      res.status(500).json({ error: "Failed to fetch venues" });
    }
  },

  async createVenue(req: Request, res: Response) {
    try {
      const { name, status, photoURL, latitude, longitude } = req.body;
      const venue = await venueService.createVenue({ name, status, photoURL, latitude, longitude });

      socketService.emitVenueUpdate(venue);

      res.status(201).json(venue);
    } catch (error) {
      console.error("Error creating venue:", error);
      res.status(500).json({ error: "Failed to create venue" });
    }
  },

  async updateVenueStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      const venue = await venueService.updateVenueStatus(req.params.id, status);

      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      socketService.emitVenueUpdate(venue);
      res.json(venue);
    } catch (error) {
      console.error("Error updating venue status:", error);
      res.status(500).json({ error: "Failed to update venue status" });
    }
  },

  async updateVenue(req: Request, res: Response) {
    try {
      const venue = await venueService.updateVenue(req.params.id, req.body);

      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      socketService.emitVenueUpdate(venue);
      res.json(venue);
    } catch (error) {
      console.error("Error updating venue:", error);
      res.status(500).json({ error: "Failed to update venue" });
    }
  },

  async updateVenuePhoto(req: Request, res: Response) {
    try {
      const { photoURL } = req.body;

      if (!photoURL) {
        return res.status(400).json({ error: "Photo URL is required" });
      }

      const venue = await venueService.updateVenuePhoto(req.params.id, photoURL);

      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      socketService.emitVenueUpdate(venue);
      res.json(venue);
    } catch (error) {
      console.error("Error updating venue photo:", error);
      res.status(500).json({ error: "Failed to update venue photo" });
    }
  },

  async deleteVenue(req: Request, res: Response) {
    try {
      const venue = await venueService.deleteVenue(req.params.id);

      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      socketService.emitVenueDelete(req.params.id);
      res.json({ message: "Venue deleted successfully" });
    } catch (error) {
      console.error("Error deleting venue:", error);
      res.status(500).json({ error: "Failed to delete venue" });
    }
  },

  async attendVenue(req: Request, res: Response) {
    try {
      const user = getUser(req);
      const result = await venueService.attendVenue(req.params.id, user.id);

      if (!result) {
        return res.status(404).json({ error: "Venue not found" });
      }

      // Check if result contains an error
      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }

      // At this point, result is guaranteed to be IVenue
      socketService.emitVenueUpdate(result);
      socketService.emitVenueAttendeesUpdate(req.params.id, result.attendees || []);

      res.json(result);
    } catch (error) {
      console.error("Error attending venue:", error);
      res.status(500).json({ error: "Failed to attend venue" });
    }
  },

  async cancelAttendance(req: Request, res: Response) {
    try {
      const user = getUser(req);
      const result = await venueService.cancelAttendance(req.params.id, user.id);

      if (!result) {
        return res.status(404).json({ error: "Venue not found" });
      }

      // Check if result contains an error
      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }

      // At this point, result is guaranteed to be IVenue
      socketService.emitVenueUpdate(result);
      socketService.emitVenueAttendeesUpdate(req.params.id, result.attendees || []);

      res.json(result);
    } catch (error) {
      console.error("Error canceling attendance:", error);
      res.status(500).json({ error: "Failed to cancel attendance" });
    }
  },

  async removeAllAttendees(req: Request, res: Response) {
    try {
      const venue = await venueService.removeAllAttendees(req.params.id);

      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      socketService.emitVenueUpdate(venue);
      socketService.emitVenueAttendeesUpdate(req.params.id, []);

      res.json(venue);
    } catch (error) {
      console.error("Error removing all attendees:", error);
      res.status(500).json({ error: "Failed to remove all attendees" });
    }
  },

  async getVenueAttendees(req: Request, res: Response) {
    try {
      const attendees = await venueService.getVenueAttendees(req.params.id);
      
      if (attendees === null) {
        return res.status(404).json({ error: "Venue not found" });
      }

      res.json(attendees);
    } catch (error) {
      console.error("Error fetching venue attendees:", error);
      res.status(500).json({ error: "Failed to fetch venue attendees" });
    }
  },
};
