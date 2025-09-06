// src/services/auth.service.ts
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model";
import { generateToken } from "../utils/jwt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";
import { hashPassword, verifyPassword } from "../utils/password";
import { User as UserModel } from "../models/user.model";

// Ensure env is loaded even if this module is imported before index.ts calls dotenv.config
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
  dotenv.config({ path: path.resolve(process.cwd(), envFile) });
}

function getEnv() {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
  const SERVER_URL = process.env.SERVER_URL || process.env.API_URL || "http://localhost:5000";
  const REDIRECT_URI = `${SERVER_URL.replace(/\/$/, "")}/api/auth/google/callback`;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials are not properly configured");
  }
  return { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CLIENT_URL, SERVER_URL, REDIRECT_URI };
}

// Super admin credentials
const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";
const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || (isProduction ? "" : "masteradmin");
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || (isProduction ? "" : "malabon-master-2023");

if (isProduction && (!SUPER_ADMIN_USERNAME || !SUPER_ADMIN_PASSWORD)) {
  throw new Error("SUPER_ADMIN credentials must be set in production");
}

// Google credentials are validated lazily when needed via getEnv()

function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI } = getEnv();
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
}

const SCOPES = [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

export const authService = {
  async registerLocal(input: { username: string; password: string; firstName: string; lastName: string; phoneNumber?: string; email?: string }) {
    const { username, password, firstName, lastName, phoneNumber, email } = input;

    // Ensure uniqueness of username/email
    const existing = await UserModel.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      throw new Error("Username or email already in use");
    }

    const passwordHash = await hashPassword(password);
    const finalEmail = email && email.includes("@") ? email : `${username}@local.local`;
    const displayName = `${firstName} ${lastName}`.trim();

    const user = await UserModel.create({
      username,
      email: finalEmail,
      firstName,
      lastName,
      phoneNumber: phoneNumber || null,
      passwordHash,
      displayName,
      isProfileComplete: false,
    } as any);

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

  async loginLocal(identifier: string, password: string) {
    // identifier can be username or email
    const user = await UserModel.findOne({ $or: [{ username: identifier }, { email: identifier }] }).select("+passwordHash email displayName photoURL coverPhoto isAdmin isSuperAdmin isProfileComplete bio");
    if (!user || !user.passwordHash) {
      throw new Error("Invalid credentials");
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new Error("Invalid credentials");

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
  getGoogleAuthUrl(codeVerifier?: string) {
    const client = getOAuthClient();
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

    const client = getOAuthClient();
    const { tokens } = await client.getToken(tokenOptions);
    const idToken = tokens.id_token;

    if (!idToken) {
      throw new Error("No ID token received from Google");
    }

    return this.handleGoogleSignIn(idToken);
  },

  async verifyGoogleToken(token: string) {
    try {
      const { GOOGLE_CLIENT_ID } = getEnv();
      const client = getOAuthClient();
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
