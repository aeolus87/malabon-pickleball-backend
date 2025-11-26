// src/utils/userResponse.ts
// Centralized user response formatting to eliminate duplication

import { UserRole, ICoachProfile } from "../models/user.model";

export interface UserResponse {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  coverPhoto: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isVerified: boolean;
  bio: string | null;
  role: UserRole;
  coachProfile?: ICoachProfile;
  isPublicProfile: boolean;
}

export interface PublicUserResponse {
  id: string;
  displayName: string | null;
  photoURL: string | null;
  coverPhoto: string | null;
  bio: string | null;
  role: UserRole;
  coachProfile?: ICoachProfile;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

/**
 * Formats a user document into a consistent response object.
 * Used across auth and user services to ensure consistent API responses.
 */
export const formatUserResponse = (user: any): UserResponse => ({
  id: user._id?.toString() || user.id,
  email: user.email,
  displayName: user.displayName || null,
  photoURL: user.photoURL || null,
  coverPhoto: user.coverPhoto || null,
  isAdmin: user.isAdmin || false,
  isSuperAdmin: user.isSuperAdmin || false,
  isVerified: user.isVerified || false,
  bio: user.bio || null,
  role: user.role || "player",
  coachProfile: user.coachProfile || undefined,
  isPublicProfile: user.isPublicProfile !== false,
});

/**
 * Formats a user document for public viewing (no sensitive info).
 */
export const formatPublicUserResponse = (user: any): PublicUserResponse => ({
  id: user._id?.toString() || user.id,
  displayName: user.displayName || null,
  photoURL: user.photoURL || null,
  coverPhoto: user.coverPhoto || null,
  bio: user.bio || null,
  role: user.role || "player",
  coachProfile: user.role === "coach" ? user.coachProfile : undefined,
});

/**
 * Creates a full auth response with token and formatted user.
 */
export const createAuthResponse = (token: string, user: any): AuthResponse => ({
  token,
  user: formatUserResponse(user),
});
