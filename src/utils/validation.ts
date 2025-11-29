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

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate password against security requirements
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  
  if (!password) {
    return { valid: false, errors: ["Password is required"] };
  }
  
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least 1 uppercase letter");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least 1 lowercase letter");
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least 1 number");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};