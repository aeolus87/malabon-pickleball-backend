// src/controllers/session.controller.ts
import { Request, Response } from "express";
import { sessionService } from "../services/session.service";
import { getAuthUser } from "../middleware/auth.middleware";

export const sessionController = {
  /**
   * Get all sessions with optional filters
   */
  async getSessions(req: Request, res: Response) {
    try {
      const { venueId, coachId, date, startDate, endDate, status } = req.query;

      const filters: any = {};
      if (venueId) filters.venueId = venueId as string;
      if (coachId) filters.coachId = coachId as string;
      if (date) filters.date = new Date(date as string);
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (status) filters.status = status as string;

      const sessions = await sessionService.getSessions(filters);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  },

  /**
   * Get a single session by ID
   */
  async getSessionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const session = await sessionService.getSessionById(id);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  },

  /**
   * Create a new session (admin/coach only)
   */
  async createSession(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      
      // Check if user is admin or coach
      if (!user.isAdmin && user.role !== "coach") {
        return res.status(403).json({ error: "Only admins and coaches can create sessions" });
      }

      const { venueId, date, startTime, endTime, coachId, maxPlayers, title, description } = req.body;

      if (!venueId || !date || !startTime || !endTime) {
        return res.status(400).json({ error: "Missing required fields: venueId, date, startTime, endTime" });
      }

      const session = await sessionService.createSession({
        venueId,
        date: new Date(date),
        startTime,
        endTime,
        coachId,
        maxPlayers,
        title,
        description,
      });

      res.status(201).json(session);
    } catch (error: any) {
      console.error("Error creating session:", error);
      res.status(400).json({ error: error.message || "Failed to create session" });
    }
  },

  /**
   * Update a session (admin/coach only)
   */
  async updateSession(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      const { id } = req.params;

      // Check if user is admin or coach
      if (!user.isAdmin && user.role !== "coach") {
        return res.status(403).json({ error: "Only admins and coaches can update sessions" });
      }

      const session = await sessionService.updateSession(id, req.body);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json(session);
    } catch (error: any) {
      console.error("Error updating session:", error);
      res.status(400).json({ error: error.message || "Failed to update session" });
    }
  },

  /**
   * Delete a session (admin or session coach only)
   */
  async deleteSession(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      const { id } = req.params;

      // Get session first to check ownership
      const existingSession = await sessionService.getSessionById(id);
      if (!existingSession) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Allow admins or the session's coach to delete
      const isSessionCoach = existingSession.coachId?._id?.toString() === user.id;
      if (!user.isAdmin && !isSessionCoach) {
        return res.status(403).json({ error: "Only admins or the session coach can delete sessions" });
      }

      const session = await sessionService.deleteSession(id);

      res.json({ success: true, message: "Session deleted" });
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  },

  /**
   * Attend a session
   */
  async attendSession(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      const { id } = req.params;

      const session = await sessionService.attendSession(id, user.id);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json(session);
    } catch (error: any) {
      console.error("Error attending session:", error);
      res.status(400).json({ error: error.message || "Failed to attend session" });
    }
  },

  /**
   * Leave a session
   */
  async leaveSession(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      const { id } = req.params;

      const session = await sessionService.leaveSession(id, user.id);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json(session);
    } catch (error: any) {
      console.error("Error leaving session:", error);
      res.status(400).json({ error: error.message || "Failed to leave session" });
    }
  },

  /**
   * Assign a coach to a session (admin only)
   */
  async assignCoach(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      const { id } = req.params;
      const { coachId } = req.body;

      if (!user.isAdmin) {
        return res.status(403).json({ error: "Only admins can assign coaches" });
      }

      const session = await sessionService.assignCoach(id, coachId);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json(session);
    } catch (error: any) {
      console.error("Error assigning coach:", error);
      res.status(400).json({ error: error.message || "Failed to assign coach" });
    }
  },

  /**
   * Get sessions by venue
   */
  async getSessionsByVenue(req: Request, res: Response) {
    try {
      const { venueId } = req.params;
      const { date } = req.query;

      const sessions = await sessionService.getSessionsByVenue(
        venueId,
        date ? new Date(date as string) : undefined
      );

      res.json(sessions);
    } catch (error) {
      console.error("Error fetching venue sessions:", error);
      res.status(500).json({ error: "Failed to fetch venue sessions" });
    }
  },

  /**
   * Get upcoming sessions
   */
  async getUpcomingSessions(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const sessions = await sessionService.getUpcomingSessions(limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching upcoming sessions:", error);
      res.status(500).json({ error: "Failed to fetch upcoming sessions" });
    }
  },
};







