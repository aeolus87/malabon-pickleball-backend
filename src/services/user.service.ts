// src/services/user.service.ts
import crypto from "crypto";
import { User } from "../models/user.model";
import { validateObjectId, validatePhilippinesPhoneNumber } from "../utils/validation";
import { hashPassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { formatUserResponse, createAuthResponse, AuthResponse } from "../utils/userResponse";

// Standard population fields for user data
const USER_FIELDS = "_id email displayName photoURL coverPhoto bio isAdmin isSuperAdmin isVerified role coachProfile createdAt";

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  photoURL?: string;
  coverPhoto?: string;
}

export interface CreateLocalUserInput {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email: string;
}

export interface GoogleUserInfo {
  email: string;
  name?: string;
  picture?: string;
}

export const userService = {
  // ============================================
  // User Creation Methods
  // ============================================

  /**
   * Creates a new local user with email verification setup.
   * Used by auth.service for local registration.
   */
  async createLocalUser(input: CreateLocalUserInput): Promise<AuthResponse> {
    const { username, password, firstName, lastName, phoneNumber, email } = input;

    // Validate email
    if (!email || !email.includes("@")) {
      throw new Error("Valid email address is required");
    }

    // Validate phone number if provided
    if (phoneNumber && !validatePhilippinesPhoneNumber(phoneNumber)) {
      throw new Error("Phone number must be in Philippines format (+639XXXXXXXXX or 09XXXXXXXXX)");
    }

    // Check uniqueness
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      throw new Error("Username or email already in use");
    }

    const passwordHash = await hashPassword(password);
    const displayName = `${firstName} ${lastName}`.trim();

    // Generate verification token and code
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      username,
      email,
      firstName,
      lastName,
      phoneNumber: phoneNumber || null,
      passwordHash,
      displayName,
      isVerified: false,
      verificationToken,
      verificationTokenExpiry,
      verificationCode,
      verificationCodeExpiry,
    } as any);

    return createAuthResponse(generateToken(user._id.toString()), user);
  },

  /**
   * Finds an existing Google user or creates a new one.
   * Used by auth.service for Google OAuth.
   */
  async findOrCreateGoogleUser(googleUserInfo: GoogleUserInfo): Promise<{ user: any; isNew: boolean }> {
    let user = await User.findOne({ email: googleUserInfo.email });
    const isNew = !user;

    if (!user) {
      user = await User.create({
        email: googleUserInfo.email,
        displayName: googleUserInfo.name,
        photoURL: null, // Never use Google profile picture
        isVerified: true, // Google accounts are already verified
      });
    } else {
      // Update display name if changed
      let needsSave = false;
      if (googleUserInfo.name && user.displayName !== googleUserInfo.name) {
        user.displayName = googleUserInfo.name;
        needsSave = true;
      }
      // Ensure Google users are marked as verified
      if (!user.isVerified) {
        user.isVerified = true;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }
    }

    return { user, isNew };
  },

  /**
   * Completes email verification for a user.
   * Shared logic for both token and code verification.
   */
  async completeEmailVerification(user: any): Promise<{
    success: boolean;
    autoLogin: boolean;
    token?: string;
    user?: any;
    message: string;
  }> {
    if (user.isVerified) {
      throw new Error("Email already verified");
    }

    // Calculate time since registration
    const timeDifferenceMinutes = (Date.now() - user.createdAt.getTime()) / (1000 * 60);
    const isInstantVerification = timeDifferenceMinutes <= 5;

    // Update user
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    user.verificationCode = null;
    user.verificationCodeExpiry = null;
    await user.save();

    // Return appropriate response
    if (isInstantVerification) {
      return {
        success: true,
        autoLogin: true,
        token: generateToken(user._id.toString()),
        user: formatUserResponse(user),
        message: "Email verified successfully",
      };
    }

    return {
      success: true,
      autoLogin: false,
      message: "Email verified successfully. Please log in to continue.",
    };
  },

  /**
   * Finds a user for token-based email verification.
   */
  async findUserByVerificationToken(token: string) {
    return User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() },
    }).select("+verificationToken");
  },

  /**
   * Finds a user for code-based email verification.
   */
  async findUserByVerificationCode(email: string, code: string) {
    return User.findOne({
      email,
      verificationCode: code,
      verificationCodeExpiry: { $gt: new Date() },
    }).select("+verificationCode");
  },

  // ============================================
  // Profile Management Methods
  // ============================================

  async updateUserProfile(userId: string, updates: UpdateProfileData) {
    if (!validateObjectId(userId)) return null;

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    return User.findByIdAndUpdate(userId, { $set: cleanUpdates }, { new: true })
      .select("-password");
  },

  async getUserProfile(userId: string) {
    if (!validateObjectId(userId)) return null;

    return User.findById(userId)
      .populate("clubs")
      .select("-password");
  },

  // ============================================
  // User Lookup Methods
  // ============================================

  async checkUserExists(email: string) {
    const exists = await User.exists({ email });
    return !!exists;
  },

  async findUserByEmail(email: string) {
    return User.findOne({ email }).select("-password");
  },

  async findUserById(id: string) {
    if (!validateObjectId(id)) return null;
    return User.findById(id).select("-password");
  },

  async getAllUsers() {
    return User.find()
      .select(USER_FIELDS)
      .sort({ email: 1 });
  },

  async getAdminUsers() {
    return User.find({ isAdmin: true })
      .select(USER_FIELDS)
      .sort({ email: 1 });
  },

  // ============================================
  // Admin Management Methods
  // ============================================

  async grantAdminPrivileges(userId: string) {
    if (!validateObjectId(userId)) return null;

    const user = await User.findById(userId);
    if (!user) return null;

    if (user.isAdmin) {
      return { error: "User already has admin privileges" };
    }

    user.isAdmin = true;
    await user.save();
    return user;
  },

  async revokeAdminPrivileges(userId: string) {
    if (!validateObjectId(userId)) return null;

    const user = await User.findById(userId);
    if (!user) return null;

    if (!user.isAdmin) {
      return { error: "User does not have admin privileges" };
    }

    if (user.isSuperAdmin) {
      return { error: "Cannot revoke admin privileges from a super admin" };
    }

    user.isAdmin = false;
    await user.save();
    return user;
  },

  async deleteUser(userId: string) {
    if (!validateObjectId(userId)) return null;
    return User.findByIdAndDelete(userId);
  },

  async createUser(userData: {
    email: string;
    displayName?: string;
    photoURL?: string;
    isAdmin?: boolean;
  }) {
    const newUser = new User({ ...userData });
    await newUser.save();
    return newUser.toObject();
  },

  // ============================================
  // Search and Public Profile Methods
  // ============================================

  /**
   * Search users by name (display name)
   */
  async searchUsers(query: string, limit: number = 10) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchRegex = new RegExp(query.trim(), "i");
    
    return User.find({
      displayName: searchRegex,
      isPublicProfile: { $ne: false },
    })
      .select("_id displayName photoURL role coachProfile bio")
      .limit(limit)
      .lean();
  },

  /**
   * Get public profile of a user
   */
  async getPublicProfile(userId: string) {
    if (!validateObjectId(userId)) return null;

    const user = await User.findById(userId)
      .select("_id displayName photoURL coverPhoto bio role coachProfile isPublicProfile")
      .lean();

    if (!user) return null;

    // Check if profile is public
    if (user.isPublicProfile === false) {
      return { private: true };
    }

    return user;
  },

  // ============================================
  // Coach-specific Methods
  // ============================================

  /**
   * Get all coaches
   */
  async getAllCoaches() {
    return User.find({
      role: "coach",
      isPublicProfile: { $ne: false },
    })
      .select("_id displayName photoURL bio role coachProfile")
      .sort({ displayName: 1 })
      .lean();
  },

  /**
   * Update coach profile
   */
  async updateCoachProfile(userId: string, updates: {
    bio?: string;
    specialization?: string;
    isAvailable?: boolean;
  }) {
    if (!validateObjectId(userId)) return null;

    const user = await User.findById(userId);
    if (!user || user.role !== "coach") {
      return null;
    }

    // Initialize coach profile if it doesn't exist
    if (!user.coachProfile) {
      user.coachProfile = { isAvailable: true };
    }

    // Update only provided fields
    if (updates.bio !== undefined) user.coachProfile.bio = updates.bio;
    if (updates.specialization !== undefined) user.coachProfile.specialization = updates.specialization;
    if (updates.isAvailable !== undefined) user.coachProfile.isAvailable = updates.isAvailable;

    await user.save();
    return user;
  },

  /**
   * Set user role (admin only)
   */
  async setUserRole(userId: string, role: "player" | "coach" | "admin" | "superadmin") {
    if (!validateObjectId(userId)) return null;

    const user = await User.findById(userId);
    if (!user) return null;

    user.role = role;

    // Initialize coach profile if becoming a coach
    if (role === "coach" && !user.coachProfile) {
      user.coachProfile = {
        bio: undefined,
        specialization: undefined,
        isAvailable: true,
      };
    }

    // Update isAdmin flags based on role
    if (role === "admin" || role === "superadmin") {
      user.isAdmin = true;
    }
    if (role === "superadmin") {
      user.isSuperAdmin = true;
    }

    await user.save();
    return user;
  },
};
