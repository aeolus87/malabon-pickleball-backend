import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { userService } from "../services/user.service";
import { getAuthUser, getAuthToken } from "../middleware/auth.middleware";

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
      const token = getAuthToken(req);
      await authService.logout(user.id, token);
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

  /**
   * Resends verification code to email.
   */
  async resendVerification(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      await authService.resendVerificationCode(email);
      // Always return success to prevent email enumeration
      return res.json({ success: true, message: "If an account exists with this email, a new verification code has been sent." });
    } catch (error) {
      console.error("Resend verification error:", error);
      const msg = error instanceof Error ? error.message : "Failed to resend verification code";
      return res.status(400).json({ error: msg });
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
      // Preserve error code if it exists (e.g., EMAIL_NOT_VERIFIED, ACCOUNT_LOCKED)
      if (error.code) {
        const response: any = { error: msg, code: error.code };
        if (error.email) {
          response.email = error.email;
        }
        return res.status(401).json(response);
      }
      return res.status(401).json({ error: msg });
    }
  },

  // ============================================
  // Password Reset
  // ============================================

  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      await authService.requestPasswordReset(email);
      // Always return success to prevent email enumeration
      res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  },

  async verifyResetToken(req: Request, res: Response) {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Reset token is required" });
      }

      const result = await authService.verifyResetToken(token);
      if (!result.valid) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      res.json({ valid: true, email: result.email });
    } catch (error) {
      console.error("Verify reset token error:", error);
      res.status(500).json({ error: "Failed to verify reset token" });
    }
  },

  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      await authService.resetPassword(token, password);
      res.json({ success: true, message: "Password has been reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      const msg = error instanceof Error ? error.message : "Failed to reset password";
      res.status(400).json({ error: msg });
    }
  },

  async changePassword(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      await authService.changePassword(user.id, currentPassword, newPassword);
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error: any) {
      console.error("Change password error:", error);
      const msg = error instanceof Error ? error.message : "Failed to change password";
      res.status(400).json({ error: msg });
    }
  },

  // ============================================
  // Email Preferences
  // ============================================

  async getEmailPreferences(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      const prefs = await authService.getEmailPreferences(user.id);

      if (!prefs) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(prefs);
    } catch (error) {
      console.error("Get email preferences error:", error);
      res.status(500).json({ error: "Failed to get email preferences" });
    }
  },

  async updateEmailPreferences(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      const { emailNotifications } = req.body;

      if (typeof emailNotifications !== "boolean") {
        return res.status(400).json({ error: "emailNotifications must be a boolean" });
      }

      await authService.updateEmailPreferences(user.id, emailNotifications);
      res.json({ success: true, emailNotifications });
    } catch (error: any) {
      console.error("Update email preferences error:", error);
      const msg = error instanceof Error ? error.message : "Failed to update email preferences";
      res.status(400).json({ error: msg });
    }
  },

  // ============================================
  // Account Unlock
  // ============================================

  async unlockAccount(req: Request, res: Response) {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: "Email and unlock code are required" });
      }

      const result = await authService.unlockAccount(email, code);
      res.json(result);
    } catch (error: any) {
      console.error("Unlock account error:", error);
      const msg = error instanceof Error ? error.message : "Failed to unlock account";
      res.status(400).json({ error: msg });
    }
  },

  async resendUnlockCode(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      await authService.resendUnlockCode(email);
      // Always return success to prevent email enumeration
      res.json({ success: true, message: "If the account is locked, a new unlock code has been sent." });
    } catch (error: any) {
      console.error("Resend unlock code error:", error);
      const msg = error instanceof Error ? error.message : "Failed to resend unlock code";
      res.status(400).json({ error: msg });
    }
  },
};
