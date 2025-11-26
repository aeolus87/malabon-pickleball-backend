// src/routes/session.routes.ts
import { Router } from "express";
import { sessionController } from "../controllers/session.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// Public routes
router.get("/", sessionController.getSessions);
router.get("/upcoming", sessionController.getUpcomingSessions);
router.get("/venue/:venueId", sessionController.getSessionsByVenue);
router.get("/:id", sessionController.getSessionById);

// Protected routes
router.post("/", authenticateToken, sessionController.createSession);
router.put("/:id", authenticateToken, sessionController.updateSession);
router.delete("/:id", authenticateToken, sessionController.deleteSession);
router.post("/:id/attend", authenticateToken, sessionController.attendSession);
router.post("/:id/leave", authenticateToken, sessionController.leaveSession);
router.post("/:id/assign-coach", authenticateToken, sessionController.assignCoach);

export default router;

