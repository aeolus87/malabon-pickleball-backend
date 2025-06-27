import { Request, Response } from "express";
import { authService } from "../services/auth.service";
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
};
