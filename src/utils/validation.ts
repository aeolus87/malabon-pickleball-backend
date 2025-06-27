import mongoose from "mongoose";

export const validateObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

export const validateObjectIds = (...ids: string[]): boolean => {
  return ids.every(id => mongoose.Types.ObjectId.isValid(id));
};

export const toObjectId = (id: string): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(id);
}; 