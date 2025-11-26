// src/models/session.model.ts
import mongoose, { Document, Schema } from "mongoose";

export type SessionStatus = "open" | "full" | "cancelled";

export interface ISession extends Document {
  venueId: mongoose.Types.ObjectId;
  date: Date;
  startTime: string; // "14:00" format
  endTime: string; // "17:00" format
  coachId?: mongoose.Types.ObjectId | null;
  maxPlayers: number;
  attendees: mongoose.Types.ObjectId[];
  status: SessionStatus;
  title?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    venueId: {
      type: Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
        message: "Start time must be in HH:MM format",
      },
    },
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
        message: "End time must be in HH:MM format",
      },
    },
    coachId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    maxPlayers: {
      type: Number,
      default: 20,
      min: 1,
      max: 100,
    },
    attendees: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["open", "full", "cancelled"],
      default: "open",
    },
    title: {
      type: String,
      default: null,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
sessionSchema.index({ venueId: 1, date: 1 });
sessionSchema.index({ coachId: 1, date: 1 });

// Update status based on attendees count
sessionSchema.pre("save", function (next) {
  if (this.attendees.length >= this.maxPlayers && this.status !== "cancelled") {
    this.status = "full";
  } else if (this.attendees.length < this.maxPlayers && this.status === "full") {
    this.status = "open";
  }
  next();
});

export const Session = mongoose.model<ISession>("Session", sessionSchema);

