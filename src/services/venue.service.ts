// src/services/venue.service.ts
import { Venue, IVenue } from "../models/venue.model";
import mongoose from "mongoose";

export const venueService = {
  async getAllVenues() {
    return Venue.find().populate("attendees", "displayName photoURL").lean();
  },

  async getVenueById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return Venue.findById(id)
      .populate("attendees", "displayName photoURL")
      .lean();
  },

  async createVenue(venueData: {
    name: string;
    status: string;
    photoURL?: string;
  }) {
    const venue = new Venue(venueData);
    return venue.save();
  },

  async updateVenueStatus(id: string, status: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return Venue.findByIdAndUpdate(id, { status }, { new: true }).populate(
      "attendees",
      "displayName photoURL"
    );
  },

  async updateVenuePhoto(id: string, photoURL: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return Venue.findByIdAndUpdate(id, { photoURL }, { new: true }).populate(
      "attendees",
      "displayName photoURL email"
    );
  },

  async updateVenue(id: string, updates: Partial<IVenue>) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    // Only allow certain fields to be updated
    const allowedUpdates: Record<string, any> = {
      name: updates.name,
      status: updates.status,
      photoURL: updates.photoURL,
      // Add other fields that should be updateable
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach((key) => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });

    return Venue.findByIdAndUpdate(id, allowedUpdates, { new: true }).populate(
      "attendees",
      "displayName photoURL email"
    );
  },

  async deleteVenue(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return Venue.findByIdAndDelete(id);
  },

  async attendVenue(venueId: string, userId: string) {
    if (
      !mongoose.Types.ObjectId.isValid(venueId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return null;
    }

    // Check if user has exceeded the cancellation limit
    const venue = await Venue.findById(venueId);
    if (!venue) return null;

    // Check cancellation count using string key access since Mongoose maps are used as objects in practice
    const cancellationCountsObj = venue.get("cancellationCounts") || {};
    const userCancellations = cancellationCountsObj[userId] || 0;

    if (userCancellations >= 2) {
      // Create a custom error response that will be caught in the controller
      const errorVenue = venue.toObject();
      (errorVenue as any).error =
        "You've already cancelled attendance for this venue twice. You can't sign up again.";
      return errorVenue;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    return Venue.findByIdAndUpdate(
      venueId,
      { $addToSet: { attendees: userObjectId } },
      { new: true }
    ).populate("attendees", "displayName photoURL email");
  },

  async cancelAttendance(venueId: string, userId: string) {
    if (
      !mongoose.Types.ObjectId.isValid(venueId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return null;
    }

    // First check if user is actually attending
    const venue = await Venue.findById(venueId);
    if (!venue) return null;

    const isAttending = venue.attendees.some(
      (attendeeId) => attendeeId.toString() === userId
    );

    if (!isAttending) {
      const errorVenue = venue.toObject();
      (errorVenue as any).error = "You are not currently attending this venue.";
      return errorVenue;
    }

    // Increment cancellation count for this user
    const cancellationCountsObj = venue.get("cancellationCounts") || {};
    const currentCount = cancellationCountsObj[userId] || 0;

    // Now remove from attendees and update cancellation count
    const userObjectId = new mongoose.Types.ObjectId(userId);
    return Venue.findByIdAndUpdate(
      venueId,
      {
        $pull: { attendees: userObjectId },
        $set: { [`cancellationCounts.${userId}`]: currentCount + 1 },
      },
      { new: true }
    ).populate("attendees", "displayName photoURL email");
  },

  async getVenueAttendees(venueId: string) {
    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      return null;
    }

    const venue = await Venue.findById(venueId).populate(
      "attendees",
      "displayName photoURL"
    );
    return venue ? venue.attendees : null;
  },

  async removeAllAttendees(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return Venue.findByIdAndUpdate(
      id,
      { $set: { attendees: [] } },
      { new: true }
    ).populate("attendees", "displayName photoURL email");
  },
};
