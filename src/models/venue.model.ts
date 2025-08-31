import mongoose, { Document, Schema } from "mongoose";

export interface IVenue extends Document {
  name: string;
  status: string;
  photoURL?: string;
  attendees: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  cancellationCounts: Record<string, number>; // Track user cancellations
  latitude?: number;
  longitude?: number;
}

const venueSchema = new Schema<IVenue>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["Available", "Unavailable"],
      default: "Available",
    },
    photoURL: {
      type: String,
      trim: true,
    },
    attendees: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    cancellationCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },
  },
  {
    timestamps: true,
  }
);

export const Venue = mongoose.model<IVenue>("Venue", venueSchema);
