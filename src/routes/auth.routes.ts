import express from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// Public routes
router.get('/google/url', authController.initiateGoogleAuth);
router.post('/google/exchange', authController.exchangeCodeForToken);
router.post('/google/signin', authController.googleSignIn);

// Protected routes
router.get('/session', authenticateToken, authController.getSession);
router.post('/logout', authenticateToken, authController.logout);

// Secret super admin login route
router.post('/master-access', authController.superAdminLogin);

export default router;