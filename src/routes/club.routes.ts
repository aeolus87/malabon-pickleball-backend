// src/routes/club.routes.ts
import express from "express";
import { clubController } from "../controllers/club.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { validateClubId } from "../middleware/club.middleware";

const router = express.Router();

// Apply auth to all routes
router.use(authenticateToken);

// Public club routes
router.get("/", clubController.getAllClubs);
router.get("/with-counts", clubController.getClubsWithMemberCount);
router.get("/:clubId", validateClubId, clubController.getClubById);
router.get("/:clubId/members", validateClubId, clubController.getClubMembers);
router.get("/:clubId/with-members", validateClubId, clubController.getClubWithMembers);

// User club management routes
router.post("/user-clubs", clubController.addUserClubs);
router.post("/:clubId/join", validateClubId, clubController.joinClub);
router.post("/:clubId/leave", validateClubId, clubController.leaveClub);

export default router;
