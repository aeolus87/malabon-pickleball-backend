// src/utils/userResponse.ts
// Centralized user response formatting to eliminate duplication

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
});

/**
 * Creates a full auth response with token and formatted user.
 */
export const createAuthResponse = (token: string, user: any): AuthResponse => ({
  token,
  user: formatUserResponse(user),
});

