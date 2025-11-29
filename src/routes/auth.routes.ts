import express from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// Public routes
router.get('/google/url', authController.initiateGoogleAuth);
router.get('/google/callback', authController.googleCallback);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google/exchange', authController.exchangeCodeForToken);
router.post('/google/signin', authController.googleSignIn);
router.get('/verify-email', authController.verifyEmail);
router.post('/verify-email-code', authController.verifyEmailByCode);
router.post('/resend-verification', authController.resendVerification);

// Password reset (public)
router.post('/forgot-password', authController.requestPasswordReset);
router.get('/verify-reset-token', authController.verifyResetToken);
router.post('/reset-password', authController.resetPassword);

// Account unlock (public)
router.post('/unlock', authController.unlockAccount);
router.post('/resend-unlock-code', authController.resendUnlockCode);

// Protected routes
router.get('/session', authenticateToken, authController.getSession);
router.post('/logout', authenticateToken, authController.logout);
router.post('/change-password', authenticateToken, authController.changePassword);

// Email preferences (protected)
router.get('/email-preferences', authenticateToken, authController.getEmailPreferences);
router.put('/email-preferences', authenticateToken, authController.updateEmailPreferences);

// Secret super admin login route
router.post('/master-access', authController.superAdminLogin);

export default router;
