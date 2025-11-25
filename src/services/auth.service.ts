// src/services/auth.service.ts
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model";
import { generateToken } from "../utils/jwt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";
import { verifyPassword } from "../utils/password";
import { userService } from "./user.service";
import { emailService } from "./email.service";
import { formatUserResponse, createAuthResponse, AuthResponse } from "../utils/userResponse";

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

function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI } = getEnv();
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
}

const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export const authService = {
  // ============================================
  // Local Authentication
  // ============================================

  /**
   * Registers a new local user. Delegates user creation to userService.
   */
  async registerLocal(input: {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    email: string;
  }): Promise<AuthResponse> {
    const result = await userService.createLocalUser(input);

    // Send verification email (non-blocking)
    const displayName = `${input.firstName} ${input.lastName}`.trim();
    const user = await User.findOne({ email: input.email }).select("+verificationToken +verificationCode");
    if (user) {
      emailService.sendVerificationEmail(
        input.email,
        user.verificationToken!,
        user.verificationCode!,
        displayName
      ).catch(err => console.error("Failed to send verification email:", err));
    }

    return result;
  },

  /**
   * Authenticates a local user with username/email and password.
   */
  async loginLocal(identifier: string, password: string): Promise<AuthResponse> {
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    }).select("+passwordHash email displayName photoURL coverPhoto isAdmin isSuperAdmin isVerified bio");

    if (!user || !user.passwordHash) {
      throw new Error("Invalid credentials");
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    // Check if user is verified (skip for super admin)
    if (!user.isSuperAdmin && !user.isVerified) {
      const error: any = new Error("Email not verified. Please verify your email before logging in.");
      error.code = "EMAIL_NOT_VERIFIED";
      throw error;
    }

    return createAuthResponse(generateToken(user._id.toString()), user);
  },

  // ============================================
  // Google OAuth
  // ============================================

  getGoogleAuthUrl(codeVerifier?: string) {
    const client = getOAuthClient();
    return client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
      ...(codeVerifier && {
        code_challenge_method: "S256" as any,
        code_challenge: this.generateCodeChallenge(codeVerifier),
      }),
    });
  },

  generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash("sha256").update(verifier).digest();
    return hash
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  },

  async exchangeCodeForToken(code: string, codeVerifier?: string): Promise<AuthResponse> {
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

  /**
   * Handles Google sign-in. Delegates user creation/lookup to userService.
   */
  async handleGoogleSignIn(token: string): Promise<AuthResponse> {
    const googleUserInfo = await this.verifyGoogleToken(token);

    const { user } = await userService.findOrCreateGoogleUser({
      email: googleUserInfo.email!,
      name: googleUserInfo.name,
      picture: googleUserInfo.picture,
    });

    return createAuthResponse(generateToken(user._id.toString()), user);
  },

  // ============================================
  // Session Management
  // ============================================

  async logout(userId: string) {
    // For JWT, client-side token removal is sufficient
    return true;
  },

  async getSession(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }
    return formatUserResponse(user);
  },

  // ============================================
  // Super Admin Authentication
  // ============================================

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
        isVerified: true,
      });
    } else if (!superAdmin.isSuperAdmin || !superAdmin.isVerified) {
      superAdmin.isSuperAdmin = true;
      superAdmin.isAdmin = true;
      superAdmin.isVerified = true;
      await superAdmin.save();
    }

    // Super admin uses different token structure
    const token = jwt.sign(
      {
        id: superAdmin._id,
        email: superAdmin.email,
        displayName: superAdmin.displayName,
        photoURL: superAdmin.photoURL,
        isAdmin: superAdmin.isAdmin,
        isSuperAdmin: superAdmin.isSuperAdmin,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    return { token, user: formatUserResponse(superAdmin) };
  },

  // ============================================
  // Token Validation
  // ============================================

  async validateToken(token: string) {
    try {
      return true;
    } catch (error) {
      return false;
    }
  },
};
