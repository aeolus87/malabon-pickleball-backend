import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { userService } from "../services/user.service";
import { getAuthUser } from "../middleware/auth.middleware";

export const authController = {
  async initiateGoogleAuth(req: Request, res: Response) {
    try {
      const codeVerifier = req.query.codeVerifier as string;
      const authUrl = authService.getGoogleAuthUrl(codeVerifier);
      res.json({ authUrl });
    } catch (error) {
      console.error("Failed to initiate Google auth:", error);
      res.status(500).json({
        error: "Failed to initiate Google auth",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async googleCallback(req: Request, res: Response) {
    try {
      const code = req.query.code as string | undefined;
      const state = req.query.state as string | undefined;

      if (!code) {
        return res.status(400).send("Missing authorization code");
      }

      const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
      const url = new URL("/auth/google/callback", clientUrl.replace(/\/$/, ""));
      url.searchParams.set("code", code);
      if (state) url.searchParams.set("state", state);

      return res.redirect(302, url.toString());
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      return res.status(500).send("OAuth callback failed");
    }
  },

  async exchangeCodeForToken(req: Request, res: Response) {
    try {
      const { code, codeVerifier } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Authorization code is required" });
      }

      const result = await authService.exchangeCodeForToken(code, codeVerifier);
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
      const user = getAuthUser(req);
      const sessionData = await authService.getSession(user.id);

      if (!sessionData) {
        return res.status(401).json({
          error: "User not found",
          code: "USER_DELETED",
          message: "Your account appears to have been deleted",
        });
      }

      res.json({ user: sessionData });
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
      const user = getAuthUser(req);
      await authService.logout(user.id);
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
      const result = await authService.authenticateSuperAdmin(username, password);

      if (!result) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json(result);
    } catch (error) {
      console.error("Super admin login error:", error);
      res.status(500).json({
        error: "Login failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async register(req: Request, res: Response) {
    try {
      const { username, password, firstName, lastName, phoneNumber, email } = req.body || {};
      if (!username || !password || !firstName || !lastName || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const result = await authService.registerLocal({
        username,
        password,
        firstName,
        lastName,
        phoneNumber,
        email,
      });
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Registration failed";
      return res.status(400).json({ error: msg });
    }
  },

  /**
   * Verifies email using a token (link-based verification).
   */
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const user = await userService.findUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      const result = await userService.completeEmailVerification(user);
      return res.json(result);
    } catch (error) {
      console.error("Email verification error:", error);
      const msg = error instanceof Error ? error.message : "Verification failed";
      return res.status(error instanceof Error && error.message === "Email already verified" ? 400 : 500).json({ error: msg });
    }
  },

  /**
   * Verifies email using a 6-digit code.
   */
  async verifyEmailByCode(req: Request, res: Response) {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: "Email and verification code are required" });
      }

      const user = await userService.findUserByVerificationCode(email, code);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification code" });
      }

      const result = await userService.completeEmailVerification(user);
      return res.json(result);
    } catch (error) {
      console.error("Email verification by code error:", error);
      const msg = error instanceof Error ? error.message : "Verification failed";
      return res.status(error instanceof Error && error.message === "Email already verified" ? 400 : 500).json({ error: msg });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body || {};
      if (!identifier || !password) {
        return res.status(400).json({ error: "Missing credentials" });
      }
      const result = await authService.loginLocal(identifier, password);
      res.json(result);
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : "Login failed";
      // Preserve error code if it exists (e.g., EMAIL_NOT_VERIFIED)
      if (error.code) {
        return res.status(401).json({ error: msg, code: error.code });
      }
      return res.status(401).json({ error: msg });
    }
  },
};
