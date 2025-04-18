// src/routes/club.routes.ts
import express from "express";
import { clubController } from "../controllers/club.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = express.Router();

// Get all clubs
router.get("/", authenticateToken, clubController.getAllClubs);

// Get clubs with member counts
router.get(
  "/with-counts",
  authenticateToken,
  clubController.getClubsWithMemberCount
);

// Get specific club by ID
router.get("/:clubId", authenticateToken, clubController.getClubById);

// Get club members
router.get(
  "/:clubId/members",
  authenticateToken,
  clubController.getClubMembers
);

// Add clubs to user
router.post("/user-clubs", authenticateToken, clubController.addUserClubs);

// Join a club
router.post("/:clubId/join", authenticateToken, clubController.joinClub);

// Leave a club
router.post("/:clubId/leave", authenticateToken, clubController.leaveClub);

export default router;
