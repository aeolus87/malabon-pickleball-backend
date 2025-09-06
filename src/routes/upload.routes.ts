import express from "express";
import { uploadController } from "../controllers/upload.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = express.Router();

// Signed upload token (requires auth to prevent abuse)
router.post("/sign", authenticateToken, uploadController.signUpload);

export default router;

