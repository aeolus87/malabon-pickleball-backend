import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
import { User } from "../models/user.model";
import jwt from "jsonwebtoken";

dotenv.config();

// Create a separate OAuth client instance for the controller - No hash in redirect URI
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.CLIENT_URL || "http://localhost:5173"}/auth/google/callback`
);

// Super admin secret credentials
const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || "masteradmin";
const SUPER_ADMIN_PASSWORD =
  process.env.SUPER_ADMIN_PASSWORD || "malabon-master-2023";

export const authController = {
  async initiateGoogleAuth(req: Request, res: Response) {
    try {
      // Get the code verifier from the client if provided
      const codeVerifier = req.query.codeVerifier as string;

      // Generate the auth URL with PKCE if code verifier is provided
      const authUrl = codeVerifier
        ? authService.getGoogleAuthUrlWithPKCE(codeVerifier)
        : authService.getGoogleAuthUrl();

      res.json({ authUrl });
    } catch (error) {
      console.error("Failed to initiate Google auth:", error);
      res.status(500).json({
        error: "Failed to initiate Google auth",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async exchangeCodeForToken(req: Request, res: Response) {
    try {
      const { code, codeVerifier } = req.body;

      if (!code) {
        return res
          .status(400)
          .json({ error: "Authorization code is required" });
      }

      // Use the local client instance to get the token with PKCE if provided
      const { tokens } = codeVerifier
        ? await client.getToken({
            code,
            codeVerifier,
          })
        : await client.getToken(code);

      const idToken = tokens.id_token;

      if (!idToken) {
        throw new Error("No ID token received from Google");
      }

      // Process the token with our service
      const result = await authService.handleGoogleSignIn(idToken);
      res.json(result);
    } catch (error) {
      console.error("Token exchange error:", error);
      res.status(401).json({
        error: "Failed to exchange code for token",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async googleSignIn(req: Request, res: Response) {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }
      const result = await authService.handleGoogleSignIn(token);
      res.json(result);
    } catch (error) {
      console.error("Google sign in error:", error);
      res.status(401).json({
        error: "Authentication failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async getSession(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "No token provided" });
      }

      // Try to get the user data from the database
      const user = await authService.getSession(req.user.id);

      // If no user is found, it likely means the account was deleted
      if (!user) {
        console.log(`Session check for deleted user: ${req.user.id}`);
        return res.status(401).json({
          error: "User not found",
          code: "USER_DELETED",
          message: "Your account appears to have been deleted",
        });
      }

      res.json({ user }); // Return user object directly in the response
    } catch (error) {
      console.error("Get session error:", error);
      res.status(401).json({
        error: "Session not found",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      await authService.logout(req.user.id);
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        error: "Logout failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async superAdminLogin(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      // Check if credentials match the secret super admin credentials
      if (
        username !== SUPER_ADMIN_USERNAME ||
        password !== SUPER_ADMIN_PASSWORD
      ) {
        // Use a generic message to not reveal which part was incorrect
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Find or create the super admin user
      let superAdmin = await User.findOne({ email: "superadmin@malabon.com" });

      if (!superAdmin) {
        // Create a super admin user if it doesn't exist
        superAdmin = await User.create({
          email: "superadmin@malabon.com",
          displayName: "Super Admin",
          isAdmin: true,
          isSuperAdmin: true,
          isProfileComplete: true,
          photoURL: null,
        });
      } else {
        // Ensure the user has super admin privileges
        if (!superAdmin.isSuperAdmin) {
          superAdmin.isSuperAdmin = true;
          superAdmin.isAdmin = true;
          await superAdmin.save();
        }
      }

      // Generate a JWT token
      const token = jwt.sign(
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
      );

      // Return the token and user info
      res.json({
        token,
        user: {
          id: superAdmin._id,
          email: superAdmin.email,
          displayName: superAdmin.displayName,
          photoURL: superAdmin.photoURL,
          isAdmin: superAdmin.isAdmin,
          isSuperAdmin: superAdmin.isSuperAdmin,
          isProfileComplete: superAdmin.isProfileComplete,
        },
      });
    } catch (error) {
      console.error("Super admin login error:", error);
      res.status(500).json({
        error: "Authentication failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
