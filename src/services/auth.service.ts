// src/services/auth.service.ts
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model";
import { generateToken } from "../utils/jwt";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
// Using direct path routing (no hash) for Google OAuth
const REDIRECT_URI = `${CLIENT_URL}/auth/google/callback`;

console.log("Auth Service: Using redirect URI:", REDIRECT_URI);

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials are not properly configured");
}

const client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

export const authService = {
  getGoogleAuthUrl() {
    const scopes = [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    return client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
    });
  },

  getGoogleAuthUrlWithPKCE(codeVerifier: string) {
    const scopes = [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    // Generate a code challenge from the code verifier using SHA256
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    return client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      code_challenge_method: "S256" as any,
      code_challenge: codeChallenge,
    });
  },

  // Helper method to generate code challenge from verifier
  generateCodeChallenge(verifier: string): string {
    // Create a SHA256 hash of the code verifier
    const hash = crypto.createHash("sha256").update(verifier).digest();
    // Base64 URL encode the hash
    return hash
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  },

  async verifyGoogleToken(token: string) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error("Invalid Google token payload");
      }

      return payload;
    } catch (error) {
      console.error("Error verifying Google token:", error);
      throw new Error("Failed to verify Google token");
    }
  },

  async handleGoogleSignIn(token: string) {
    try {
      const googleUserInfo = await this.verifyGoogleToken(token);

      // Check if user exists first
      let user = await User.findOne({ email: googleUserInfo.email });

      if (!user) {
        try {
          // Create new user
          user = new User({
            email: googleUserInfo.email,
            displayName: googleUserInfo.name,
            photoURL: null, // Never use Google profile picture for new users
            isProfileComplete: false,
          });
          await user.save();
        } catch (saveError: any) {
          // If we get a duplicate key error, try to find the user again
          // This handles race conditions where the user might have been created between our check and save
          if (saveError.code === 11000 && saveError.keyPattern?.email) {
            console.log("Duplicate key detected, retrieving existing user");
            user = await User.findOne({ email: googleUserInfo.email });
            if (!user) {
              // If we still can't find the user, something is very wrong
              throw new Error("Failed to create or retrieve user");
            }
          } else {
            // If it's not a duplicate key error, rethrow
            throw saveError;
          }
        }
      }

      // At this point we should have a valid user, either existing or newly created
      // Update user information if needed
      let needsUpdate = false;

      // NEVER update photoURL at all - let users set their own profile pictures
      // if (googleUserInfo.picture && user.photoURL === null) {
      //   user.photoURL = googleUserInfo.picture;
      //   needsUpdate = true;
      // }

      // Only update displayName if it doesn't match Google and is not customized
      if (googleUserInfo.name && user.displayName !== googleUserInfo.name) {
        user.displayName = googleUserInfo.name;
        needsUpdate = true;
      }

      if (needsUpdate) {
        try {
          await user.save();
        } catch (updateError) {
          console.error("Failed to update user profile:", updateError);
          // We can continue even if the update fails
        }
      }

      // Generate JWT token
      const jwtToken = generateToken(user._id.toString());

      return {
        token: jwtToken,
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          coverPhoto: user.coverPhoto,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          isProfileComplete: user.isProfileComplete,
          bio: user.bio,
        },
      };
    } catch (error) {
      console.error("Error in handleGoogleSignIn:", error);
      throw error;
    }
  },

  async logout(userId: string) {
    // Implement any server-side logout logic if needed
    // For JWT, client-side token removal is usually sufficient
    return true;
  },

  async getSession(userId: string) {
    const user = await User.findById(userId);

    // Return null instead of throwing error if user not found
    // This allows the controller to handle the case explicitly
    if (!user) {
      console.log(`User not found in getSession: ${userId}`);
      return null;
    }

    return {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      coverPhoto: user.coverPhoto,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      isProfileComplete: user.isProfileComplete,
      bio: user.bio,
    };
  },

  // Auth-specific validation methods
  async validateToken(token: string) {
    try {
      // Implement token validation logic
      return true;
    } catch (error) {
      return false;
    }
  },
};
