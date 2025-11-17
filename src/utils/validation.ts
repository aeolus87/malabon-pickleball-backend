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

export const validatePhilippinesPhoneNumber = (phoneNumber: string): boolean => {
  if (!phoneNumber) return false;
  
  // Remove spaces and dashes
  const cleaned = phoneNumber.replace(/[\s-]/g, '');
  
  // Check for +639 format (11 digits after +639)
  if (cleaned.startsWith('+639')) {
    return /^\+639\d{9}$/.test(cleaned);
  }
  
  // Check for 09 format (11 digits starting with 09)
  if (cleaned.startsWith('09')) {
    return /^09\d{9}$/.test(cleaned);
  }
  
  return false;
}; 