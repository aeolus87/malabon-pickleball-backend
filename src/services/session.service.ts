// src/services/session.service.ts
import { Session, ISession } from "../models/session.model";
import { User } from "../models/user.model";
import { validateObjectId } from "../utils/validation";
import mongoose from "mongoose";

// Population fields
const USER_FIELDS = "_id displayName photoURL email role coachProfile";
const VENUE_FIELDS = "_id name photoURL status";

export interface CreateSessionInput {
  venueId: string;
  date: Date;
  startTime: string;
  endTime: string;
  coachId?: string;
  maxPlayers?: number;
  title?: string;
  description?: string;
}

export interface SessionFilters {
  venueId?: string;
  coachId?: string;
  date?: Date;
  startDate?: Date;
  endDate?: Date;
  status?: string;
}

export const sessionService = {
  /**
   * Get all sessions with optional filters
   */
  async getSessions(filters: SessionFilters = {}) {
    const query: any = {};

    if (filters.venueId && validateObjectId(filters.venueId)) {
      query.venueId = filters.venueId;
    }

    if (filters.coachId && validateObjectId(filters.coachId)) {
      query.coachId = filters.coachId;
    }

    if (filters.date) {
      // Get sessions for a specific date
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = filters.startDate;
      if (filters.endDate) query.date.$lte = filters.endDate;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    return Session.find(query)
      .populate("venueId", VENUE_FIELDS)
      .populate("coachId", USER_FIELDS)
      .populate("attendees", USER_FIELDS)
      .sort({ date: 1, startTime: 1 })
      .lean();
  },

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string) {
    if (!validateObjectId(sessionId)) return null;

    return Session.findById(sessionId)
      .populate("venueId", VENUE_FIELDS)
      .populate("coachId", USER_FIELDS)
      .populate("attendees", USER_FIELDS)
      .lean();
  },

  /**
   * Create a new session
   */
  async createSession(input: CreateSessionInput) {
    const { venueId, date, startTime, endTime, coachId, maxPlayers, title, description } = input;

    if (!validateObjectId(venueId)) {
      throw new Error("Invalid venue ID");
    }

    if (coachId && !validateObjectId(coachId)) {
      throw new Error("Invalid coach ID");
    }

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      throw new Error("Time must be in HH:MM format");
    }

    // Validate end time is after start time
    if (startTime >= endTime) {
      throw new Error("End time must be after start time");
    }

    // If coachId provided, verify user is a coach
    if (coachId) {
      const coach = await User.findById(coachId);
      if (!coach || (coach.role !== "coach" && coach.role !== "admin" && coach.role !== "superadmin")) {
        throw new Error("Assigned user is not a coach");
      }
    }

    const session = await Session.create({
      venueId,
      date,
      startTime,
      endTime,
      coachId: coachId || null,
      maxPlayers: maxPlayers || 20,
      title,
      description,
      attendees: [],
      status: "open",
    });

    return this.getSessionById(session._id.toString());
  },

  /**
   * Update a session
   */
  async updateSession(sessionId: string, updates: Partial<CreateSessionInput>) {
    if (!validateObjectId(sessionId)) return null;

    const allowedUpdates = ["date", "startTime", "endTime", "coachId", "maxPlayers", "title", "description", "status"];
    const cleanUpdates: any = {};

    for (const key of allowedUpdates) {
      if (updates[key as keyof CreateSessionInput] !== undefined) {
        cleanUpdates[key] = updates[key as keyof CreateSessionInput];
      }
    }

    if (cleanUpdates.coachId && !validateObjectId(cleanUpdates.coachId)) {
      throw new Error("Invalid coach ID");
    }

    const session = await Session.findByIdAndUpdate(
      sessionId,
      { $set: cleanUpdates },
      { new: true }
    )
      .populate("venueId", VENUE_FIELDS)
      .populate("coachId", USER_FIELDS)
      .populate("attendees", USER_FIELDS);

    return session;
  },

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string) {
    if (!validateObjectId(sessionId)) return null;
    return Session.findByIdAndDelete(sessionId);
  },

  /**
   * Attend a session
   */
  async attendSession(sessionId: string, userId: string) {
    if (!validateObjectId(sessionId) || !validateObjectId(userId)) {
      return null;
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status === "cancelled") {
      throw new Error("Cannot attend a cancelled session");
    }

    if (session.status === "full") {
      throw new Error("Session is full");
    }

    // Check if already attending
    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (session.attendees.some((a) => a.equals(userObjectId))) {
      throw new Error("Already attending this session");
    }

    session.attendees.push(userObjectId);
    await session.save();

    return this.getSessionById(sessionId);
  },

  /**
   * Leave a session
   */
  async leaveSession(sessionId: string, userId: string) {
    if (!validateObjectId(sessionId) || !validateObjectId(userId)) {
      return null;
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const attendeeIndex = session.attendees.findIndex((a) => a.equals(userObjectId));

    if (attendeeIndex === -1) {
      throw new Error("Not attending this session");
    }

    session.attendees.splice(attendeeIndex, 1);
    await session.save();

    return this.getSessionById(sessionId);
  },

  /**
   * Assign a coach to a session
   */
  async assignCoach(sessionId: string, coachId: string | null) {
    if (!validateObjectId(sessionId)) return null;

    if (coachId) {
      if (!validateObjectId(coachId)) {
        throw new Error("Invalid coach ID");
      }

      const coach = await User.findById(coachId);
      if (!coach || (coach.role !== "coach" && coach.role !== "admin" && coach.role !== "superadmin")) {
        throw new Error("User is not a coach");
      }
    }

    return Session.findByIdAndUpdate(
      sessionId,
      { coachId: coachId || null },
      { new: true }
    )
      .populate("venueId", VENUE_FIELDS)
      .populate("coachId", USER_FIELDS)
      .populate("attendees", USER_FIELDS);
  },

  /**
   * Get sessions by venue
   */
  async getSessionsByVenue(venueId: string, date?: Date) {
    return this.getSessions({ venueId, date });
  },

  /**
   * Get sessions by coach
   */
  async getSessionsByCoach(coachId: string) {
    return this.getSessions({ coachId });
  },

  /**
   * Get upcoming sessions
   */
  async getUpcomingSessions(limit: number = 10) {
    const now = new Date();
    return Session.find({
      date: { $gte: now },
      status: { $ne: "cancelled" },
    })
      .populate("venueId", VENUE_FIELDS)
      .populate("coachId", USER_FIELDS)
      .populate("attendees", USER_FIELDS)
      .sort({ date: 1, startTime: 1 })
      .limit(limit)
      .lean();
  },
};


