// src/routes/user.routes.ts
import express from "express";
import { userController } from "../controllers/user.controller";
import { authenticateToken, requireAdmin, requireSuperAdmin } from "../middleware/auth.middleware";
import { validateUserId } from "../middleware/user.middleware";

const router = express.Router();

// Public routes (no auth required)
router.get("/search", userController.searchUsers);
router.get("/coaches", userController.getAllCoaches);
router.get("/:userId/profile", validateUserId, userController.getPublicProfile);

// Protected routes (auth required)
router.use(authenticateToken);

// Regular user routes
router.get("/profile", userController.getProfile);
router.put("/profile", userController.updateProfile);
router.get("/clubs", userController.getUserClubs);

// Coach routes
router.put("/coach-profile", userController.updateCoachProfile);

// Admin routes (admin can set coach role)
router.post("/set-role/:userId", requireAdmin, validateUserId, userController.setUserRole);
router.get("/all", requireAdmin, userController.getAllUsers);

// Super admin routes for user management
router.post("/grant-admin/:userId", requireSuperAdmin, validateUserId, userController.grantAdminPrivileges);
router.post("/revoke-admin/:userId", requireSuperAdmin, validateUserId, userController.revokeAdminPrivileges);
router.get("/admins", requireSuperAdmin, userController.getAdminUsers);
router.delete("/:userId", requireSuperAdmin, validateUserId, userController.deleteUser);

export default router;
