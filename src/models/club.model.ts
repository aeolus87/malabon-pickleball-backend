// src/models/club.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IClub extends Document {
  name: string;
  description: string;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clubSchema = new Schema<IClub>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  logo: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

clubSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Club = mongoose.model<IClub>('Club', clubSchema);