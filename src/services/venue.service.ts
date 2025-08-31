// src/services/venue.service.ts
import { Venue, IVenue } from "../models/venue.model";
import { User } from "../models/user.model";
import { validateObjectId, validateObjectIds, toObjectId } from "../utils/validation";
import { emailService } from "./email.service";

// Standard population fields for consistency
const ATTENDEE_FIELDS = "displayName photoURL email";

// Type for venue service responses that might include errors
type VenueServiceResult = IVenue | { error: string } | null;

export const venueService = {
  async getAllVenues() {
    return Venue.find().populate("attendees", ATTENDEE_FIELDS).lean();
  },

  async getVenueById(id: string) {
    if (!validateObjectId(id)) return null;
    
    return Venue.findById(id)
      .populate("attendees", ATTENDEE_FIELDS)
      .lean();
  },

  async createVenue(venueData: {
    name: string;
    status: string;
    photoURL?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const venue = new Venue(venueData);
    return venue.save();
  },

  async updateVenueStatus(id: string, status: string) {
    if (!validateObjectId(id)) return null;
    
    return Venue.findByIdAndUpdate(id, { status }, { new: true })
      .populate("attendees", ATTENDEE_FIELDS);
  },

  async updateVenuePhoto(id: string, photoURL: string) {
    if (!validateObjectId(id)) return null;
    
    return Venue.findByIdAndUpdate(id, { photoURL }, { new: true })
      .populate("attendees", ATTENDEE_FIELDS);
  },

  async updateVenue(id: string, updates: Partial<IVenue>) {
    if (!validateObjectId(id)) return null;

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    return Venue.findByIdAndUpdate(id, cleanUpdates, { new: true })
      .populate("attendees", ATTENDEE_FIELDS);
  },

  async deleteVenue(id: string) {
    if (!validateObjectId(id)) return null;
    
    return Venue.findByIdAndDelete(id);
  },

  async attendVenue(venueId: string, userId: string): Promise<VenueServiceResult> {
    if (!validateObjectIds(venueId, userId)) return null;

    const venue = await Venue.findById(venueId);
    if (!venue) return null;

    // Check cancellation limit
    const cancellationCount = venue.get("cancellationCounts")?.[userId] || 0;
    if (cancellationCount >= 2) {
      return { 
        ...venue.toObject(), 
        error: "You've cancelled attendance twice. Cannot sign up again." 
      };
    }

    const result = await Venue.findByIdAndUpdate(
      venueId,
      { $addToSet: { attendees: toObjectId(userId) } },
      { new: true }
    ).populate("attendees", ATTENDEE_FIELDS);

    // Send confirmation email if attendance was successful
    if (result && !('error' in result)) {
      try {
        const user = await User.findById(userId).select("email displayName");
        if (user && user.email) {
          // Send email asynchronously (don't wait for it)
          emailService.sendAttendanceConfirmation(
            user.email,
            user.displayName || 'Player',
            venue.name
          ).catch(error => {
            console.error('Failed to send confirmation email:', error);
          });
        }
      } catch (error) {
        console.error('Error sending confirmation email:', error);
        // Don't fail the attendance if email fails
      }
    }

    return result;
  },

  async cancelAttendance(venueId: string, userId: string): Promise<VenueServiceResult> {
    if (!validateObjectIds(venueId, userId)) return null;

    const venue = await Venue.findById(venueId);
    if (!venue) return null;

    // Check if user is attending
    const isAttending = venue.attendees.some(id => id.toString() === userId);
    if (!isAttending) {
      return { 
        ...venue.toObject(), 
        error: "You are not currently attending this venue." 
      };
    }

    // Increment cancellation count and remove attendee
    const currentCount = venue.get("cancellationCounts")?.[userId] || 0;
    
    return Venue.findByIdAndUpdate(
      venueId,
      {
        $pull: { attendees: toObjectId(userId) },
        $set: { [`cancellationCounts.${userId}`]: currentCount + 1 },
      },
      { new: true }
    ).populate("attendees", ATTENDEE_FIELDS);
  },

  async getVenueAttendees(venueId: string) {
    if (!validateObjectId(venueId)) return null;

    const venue = await Venue.findById(venueId).populate("attendees", ATTENDEE_FIELDS);
    return venue?.attendees || null;
  },

  async removeAllAttendees(id: string) {
    if (!validateObjectId(id)) return null;
    
    return Venue.findByIdAndUpdate(
      id,
      { $set: { attendees: [] } },
      { new: true }
    ).populate("attendees", ATTENDEE_FIELDS);
  },
};
