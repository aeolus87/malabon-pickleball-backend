// src/services/auth.service.ts
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model";
import { TokenBlacklist } from "../models/token-blacklist.model";
import { generateToken, verifyToken } from "../utils/jwt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";
import { verifyPassword, hashPassword } from "../utils/password";
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

// Account lockout configuration
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const UNLOCK_CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

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
   * Resends verification code to a user's email.
   */
  async resendVerificationCode(email: string): Promise<boolean> {
    const user = await User.findOne({ email }).select("+verificationToken +verificationCode +verificationCodeExpiry");
    
    if (!user) {
      // Return true to prevent email enumeration
      return true;
    }

    // If already verified, throw error
    if (user.isVerified) {
      throw new Error("Email is already verified");
    }

    // Generate new verification token and code
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.verificationToken = verificationToken;
    user.verificationCode = verificationCode;
    user.verificationCodeExpiry = verificationCodeExpiry;
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(
      email,
      verificationToken,
      verificationCode,
      user.displayName || ""
    );

    return true;
  },

  /**
   * Authenticates a local user with username/email and password.
   */
  async loginLocal(identifier: string, password: string): Promise<AuthResponse> {
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    }).select("+passwordHash email displayName photoURL coverPhoto isAdmin isSuperAdmin isVerified bio failedLoginAttempts lockUntil");

    if (!user || !user.passwordHash) {
      throw new Error("Invalid credentials");
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const error: any = new Error(`Account is locked. Check your email for an unlock code.`);
      error.code = "ACCOUNT_LOCKED";
      error.email = user.email;
      throw error;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      
      // Lock account if max attempts exceeded
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        
        // Generate unlock code
        const unlockCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.unlockCode = unlockCode;
        user.unlockCodeExpiry = new Date(Date.now() + UNLOCK_CODE_EXPIRY_MS);
        await user.save();
        
        // Send unlock email (non-blocking)
        emailService.sendUnlockEmail(
          user.email,
          unlockCode,
          user.displayName || ""
        ).catch(err => console.error("Failed to send unlock email:", err));
        
        const error: any = new Error(`Account locked due to too many failed attempts. Check your email for an unlock code.`);
        error.code = "ACCOUNT_LOCKED";
        error.email = user.email;
        throw error;
      }
      
      await user.save();
      const attemptsRemaining = MAX_LOGIN_ATTEMPTS - user.failedLoginAttempts;
      throw new Error(`Invalid credentials. ${attemptsRemaining} attempt(s) remaining.`);
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
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

  async logout(userId: string, token: string) {
    try {
      // Decode token to get expiry time
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        // Add token to blacklist with expiry matching the token's expiry
        await TokenBlacklist.create({
          token,
          userId,
          expiresAt: new Date(decoded.exp * 1000),
        });
      }
      return true;
    } catch (error) {
      console.error("Error blacklisting token:", error);
      // Still return true - client will remove token anyway
      return true;
    }
  },

  /**
   * Check if a token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await TokenBlacklist.findOne({ token });
    return !!blacklisted;
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

  async validateToken(token: string): Promise<boolean> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return false;
      }

      // Verify the token signature and expiry
      verifyToken(token);
      return true;
    } catch (error) {
      return false;
    }
  },


  async requestPasswordReset(email: string): Promise<boolean> {
    const user = await User.findOne({ email });
    
    if (!user) {
      return true;
    }

    if (!user.passwordHash) {
      return true;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    user.passwordResetToken = resetToken;
    user.passwordResetExpiry = resetExpiry;
    await user.save();

    emailService.sendPasswordResetEmail(
      email,
      resetToken,
      user.displayName || ""
    ).catch(err => console.error("Failed to send password reset email:", err));

    return true;
  },


  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() },
    }).select("+passwordResetToken");

    if (!user) {
      return { valid: false };
    }

    return { valid: true, email: user.email };
  },

  
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() },
    }).select("+passwordResetToken +passwordHash");

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    user.passwordHash = await hashPassword(newPassword);
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    await user.save();

    return true;
  },


  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await User.findById(userId).select("+passwordHash");

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.passwordHash) {
      throw new Error("Account uses Google login. Password cannot be changed.");
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    return true;
  },


  async updateEmailPreferences(userId: string, emailNotifications: boolean): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    user.emailNotifications = emailNotifications;
    await user.save();

    return true;
  },

  async getEmailPreferences(userId: string): Promise<{ emailNotifications: boolean } | null> {
    const user = await User.findById(userId).select("emailNotifications");
    if (!user) {
      return null;
    }

    return { emailNotifications: user.emailNotifications ?? true };
  },

  /**
   * Unlocks an account using the OTP code sent via email.
   * Returns auth token so user is automatically logged in.
   */
  async unlockAccount(email: string, code: string): Promise<AuthResponse> {
    const user = await User.findOne({ email }).select("+unlockCode +unlockCodeExpiry");
    
    if (!user) {
      throw new Error("Invalid email or code");
    }

    // Check if account is actually locked
    if (!user.lockUntil || user.lockUntil <= new Date()) {
      throw new Error("Account is not locked");
    }

    // Check if unlock code is expired
    if (!user.unlockCodeExpiry || user.unlockCodeExpiry <= new Date()) {
      throw new Error("Unlock code has expired. Please try logging in again to receive a new code.");
    }

    // Verify the unlock code
    if (user.unlockCode !== code) {
      throw new Error("Invalid unlock code");
    }

    // Reset lockout and clear unlock code
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.unlockCode = null;
    user.unlockCodeExpiry = null;
    await user.save();

    // User verified identity via email code - log them in
    return createAuthResponse(generateToken(user._id.toString()), user);
  },

  /**
   * Resends unlock code to a locked account.
   */
  async resendUnlockCode(email: string): Promise<boolean> {
    const user = await User.findOne({ email });
    
    if (!user) {
      // Return true to prevent email enumeration
      return true;
    }

    // Check if account is actually locked
    if (!user.lockUntil || user.lockUntil <= new Date()) {
      throw new Error("Account is not locked");
    }

    // Generate new unlock code
    const unlockCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.unlockCode = unlockCode;
    user.unlockCodeExpiry = new Date(Date.now() + UNLOCK_CODE_EXPIRY_MS);
    await user.save();

    // Send unlock email
    await emailService.sendUnlockEmail(
      email,
      unlockCode,
      user.displayName || ""
    );

    return true;
  },
};
