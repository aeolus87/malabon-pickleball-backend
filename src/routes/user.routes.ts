// src/routes/user.routes.ts
import express from "express";
import { userController } from "../controllers/user.controller";
import {
  authenticateToken,
  requireAdmin,
  requireSuperAdmin,
} from "../middleware/auth.middleware";

const router = express.Router();

// Regular user routes
router.get("/profile", authenticateToken, userController.getProfile);
router.put("/profile", authenticateToken, userController.updateProfile);

// Super admin routes for user management
router.post(
  "/grant-admin/:userId",
  authenticateToken,
  requireSuperAdmin,
  userController.grantAdminPrivileges
);
router.post(
  "/revoke-admin/:userId",
  authenticateToken,
  requireSuperAdmin,
  userController.revokeAdminPrivileges
);
router.get(
  "/admins",
  authenticateToken,
  requireSuperAdmin,
  userController.getAdminUsers
);
router.get(
  "/all",
  authenticateToken,
  requireSuperAdmin,
  userController.getAllUsers
);
router.delete(
  "/:userId",
  authenticateToken,
  requireSuperAdmin,
  userController.deleteUser
);

export default router;
