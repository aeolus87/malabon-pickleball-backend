// src/services/auth.service.ts
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model";
import { generateToken } from "../utils/jwt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const REDIRECT_URI = `${CLIENT_URL}/auth/google/callback`;

// Super admin credentials
const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || "masteradmin";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "malabon-master-2023";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials are not properly configured");
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

export const authService = {
  getGoogleAuthUrl(codeVerifier?: string) {
    const authUrl = client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
      ...(codeVerifier && {
      code_challenge_method: "S256" as any,
        code_challenge: this.generateCodeChallenge(codeVerifier),
      }),
    });

    return authUrl;
  },

  generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash("sha256").update(verifier).digest();
    return hash
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  },

  async exchangeCodeForToken(code: string, codeVerifier?: string) {
    const tokenOptions: any = { code };
    if (codeVerifier) {
      tokenOptions.codeVerifier = codeVerifier;
    }

    const { tokens } = await client.getToken(tokenOptions);
    const idToken = tokens.id_token;

    if (!idToken) {
      throw new Error("No ID token received from Google");
    }

    return this.handleGoogleSignIn(idToken);
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
      const googleUserInfo = await this.verifyGoogleToken(token);

    // Find or create user
      let user = await User.findOne({ email: googleUserInfo.email });

      if (!user) {
      user = await User.create({
            email: googleUserInfo.email,
            displayName: googleUserInfo.name,
        photoURL: null, // Never use Google profile picture
            isProfileComplete: false,
          });
    } else if (googleUserInfo.name && user.displayName !== googleUserInfo.name) {
      // Update display name if changed
        user.displayName = googleUserInfo.name;
          await user.save();
      }

      return {
      token: generateToken(user._id.toString()),
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
  },

  async logout(userId: string) {
    // For JWT, client-side token removal is sufficient
    return true;
  },

  async getSession(userId: string) {
    const user = await User.findById(userId);

    if (!user) {
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

  async authenticateSuperAdmin(username: string, password: string) {
    if (username !== SUPER_ADMIN_USERNAME || password !== SUPER_ADMIN_PASSWORD) {
      return null;
    }

    // Find or create super admin user
    let superAdmin = await User.findOne({ email: "superadmin@malabon.com" });

    if (!superAdmin) {
      superAdmin = await User.create({
        email: "superadmin@malabon.com",
        displayName: "Super Admin",
        isAdmin: true,
        isSuperAdmin: true,
        isProfileComplete: true,
      });
    } else if (!superAdmin.isSuperAdmin) {
      // Ensure super admin privileges
      superAdmin.isSuperAdmin = true;
      superAdmin.isAdmin = true;
      await superAdmin.save();
    }

    return {
      token: jwt.sign(
        {
          id: superAdmin._id,
          email: superAdmin.email,
          displayName: superAdmin.displayName,
          photoURL: superAdmin.photoURL,
          isAdmin: superAdmin.isAdmin,
          isSuperAdmin: superAdmin.isSuperAdmin,
          isProfileComplete: superAdmin.isProfileComplete,
        },
        process.env.JWT_SECRET!,
        { expiresIn: "24h" }
      ),
      user: {
        id: superAdmin._id,
        email: superAdmin.email,
        displayName: superAdmin.displayName,
        photoURL: superAdmin.photoURL,
        isAdmin: superAdmin.isAdmin,
        isSuperAdmin: superAdmin.isSuperAdmin,
        isProfileComplete: superAdmin.isProfileComplete,
        bio: superAdmin.bio,
        coverPhoto: superAdmin.coverPhoto,
      },
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
