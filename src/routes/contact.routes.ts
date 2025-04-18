// src/routes/contact.routes.ts
import express from "express";
import {
  contactController,
  contactValidationRules,
} from "../controllers/contact.controller";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting to prevent abuse
const contactFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many contact requests. Please try again after 15 minutes.",
  },
});

// POST /api/contact - Submit contact form
router.post(
  "/",
  contactFormLimiter,
  contactValidationRules,
  contactController.submitContactForm
);

export default router;
