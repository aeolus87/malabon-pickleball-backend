// src/controllers/venue.controller.ts
import { Request, Response } from "express";
import { venueService } from "../services/venue.service";
import { socketService } from "../services/socket.service";
import { IUser } from "../types/express";

// Don't use this type directly in the route handlers
interface AuthenticatedRequest extends Request {
  user: IUser;
}

export const venueController = {
  async getAllVenues(req: Request, res: Response) {
    try {
      // Add logging to see if this is triggering auth errors
      console.log("getAllVenues: called", req.url);

      // Get user from the request
      const user = (req as AuthenticatedRequest).user;
      console.log("getAllVenues: user", {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      });

      const venues = await venueService.getAllVenues();
      res.json(venues);
    } catch (error) {
      console.error("Error fetching venues:", error);
      res.status(500).json({ error: "Failed to fetch venues" });
    }
  },

  async createVenue(req: Request, res: Response) {
    try {
      // Cast to AuthenticatedRequest only when accessing user
      const user = (req as AuthenticatedRequest).user;

      // You might want to check if the user is an admin here
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only admins can create venues" });
      }

      const { name, status, photoURL } = req.body;
      const venue = await venueService.createVenue({ name, status, photoURL });

      // Emit socket event for real-time updates
      socketService.emitVenueUpdate(venue);

      res.status(201).json(venue);
    } catch (error) {
      console.error("Error creating venue:", error);
      res.status(500).json({ error: "Failed to create venue" });
    }
  },

  async updateVenueStatus(req: Request, res: Response) {
    try {
      // Cast to AuthenticatedRequest only when accessing user
      const user = (req as AuthenticatedRequest).user;

      // You might want to check if the user is an admin here
      if (!user.isAdmin) {
        return res
          .status(403)
          .json({ error: "Only admins can update venue status" });
      }

      const { status } = req.body;
      const venue = await venueService.updateVenueStatus(req.params.id, status);

      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      // Emit socket event for real-time updates
      socketService.emitVenueUpdate(venue);

      res.json(venue);
    } catch (error) {
      console.error("Error updating venue status:", error);
      res.status(500).json({ error: "Failed to update venue status" });
    }
  },

  async updateVenue(req: Request, res: Response) {
    try {
      // Cast to AuthenticatedRequest only when accessing user
      const user = (req as AuthenticatedRequest).user;

      // Check if the user is an admin
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only admins can update venues" });
      }

      const venue = await venueService.updateVenue(req.params.id, req.body);

      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      res.json(venue);
    } catch (error) {
      console.error("Error updating venue:", error);
      res.status(500).json({ error: "Failed to update venue" });
    }
  },

  async updateVenuePhoto(req: Request, res: Response) {
    try {
      // Cast to AuthenticatedRequest only when accessing user
      const user = (req as AuthenticatedRequest).user;

      // Check if the user is an admin
      if (!user.isAdmin) {
        return res
          .status(403)
          .json({ error: "Only admins can update venue photos" });
      }

      const { photoURL } = req.body;

      if (!photoURL) {
        return res.status(400).json({ error: "Photo URL is required" });
      }

      const venue = await venueService.updateVenuePhoto(
        req.params.id,
        photoURL
      );

      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      // Emit socket event for real-time updates
      socketService.emitVenueUpdate(venue);

      res.json(venue);
    } catch (error) {
      console.error("Error updating venue photo:", error);
      res.status(500).json({ error: "Failed to update venue photo" });
    }
  },

  async deleteVenue(req: Request, res: Response) {
    try {
      // Cast to AuthenticatedRequest only when accessing user
      const user = (req as AuthenticatedRequest).user;

      // You might want to check if the user is an admin here
      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only admins can delete venues" });
      }

      const venue = await venueService.deleteVenue(req.params.id);

      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      // Emit socket event for real-time updates
      socketService.emitVenueDelete(req.params.id);

      res.json({ message: "Venue deleted successfully" });
    } catch (error) {
      console.error("Error deleting venue:", error);
      res.status(500).json({ error: "Failed to delete venue" });
    }
  },

  async attendVenue(req: Request, res: Response) {
    try {
      // Cast to AuthenticatedRequest only when accessing user
      const user = (req as AuthenticatedRequest).user;

      const venue = await venueService.attendVenue(req.params.id, user.id);

      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      // Check for custom error response
      if ((venue as any).error) {
        return res.status(400).json({ error: (venue as any).error });
      }

      // Emit socket event for real-time updates
      socketService.emitVenueUpdate(venue);

      // Get attendees and emit to all users in this venue room
      const attendees = venue.attendees || [];
      socketService.emitVenueAttendeesUpdate(req.params.id, attendees);

      res.json(venue);
    } catch (error) {
      console.error("Error attending venue:", error);
      res.status(500).json({ error: "Failed to attend venue" });
    }
  },

  async cancelAttendance(req: Request, res: Response) {
    try {
      // Cast to AuthenticatedRequest only when accessing user
      const user = (req as AuthenticatedRequest).user;

      const venue = await venueService.cancelAttendance(req.params.id, user.id);

      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      // Check for custom error response
      if ((venue as any).error) {
        return res.status(400).json({ error: (venue as any).error });
      }

      // Emit socket event for real-time updates
      socketService.emitVenueUpdate(venue);

      // Get attendees and emit to all users in this venue room
      const attendees = venue.attendees || [];
      socketService.emitVenueAttendeesUpdate(req.params.id, attendees);

      res.json(venue);
    } catch (error) {
      console.error("Error canceling attendance:", error);
      res.status(500).json({ error: "Failed to cancel attendance" });
    }
  },

  async removeAllAttendees(req: Request, res: Response) {
    try {
      // Cast to AuthenticatedRequest only when accessing user
      const user = (req as AuthenticatedRequest).user;

      if (!user.isAdmin) {
        return res
          .status(403)
          .json({ error: "Only admins can remove all attendees" });
      }

      const venue = await venueService.removeAllAttendees(req.params.id);

      if (!venue) {
        return res.status(404).json({ error: "Venue not found" });
      }

      // Emit socket event for real-time updates
      socketService.emitVenueUpdate(venue);

      // Emit empty attendees list to all users in this venue room
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
      res.json(attendees);
    } catch (error) {
      console.error("Error fetching venue attendees:", error);
      res.status(500).json({ error: "Failed to fetch venue attendees" });
    }
  },
};
