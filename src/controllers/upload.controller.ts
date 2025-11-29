import { Request, Response } from "express";
import crypto from "crypto";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Allowed folders for Cloudinary uploads
const ALLOWED_FOLDERS = ["profile-photos", "cover-photos", "club-logos", "venue-images"];

/**
 * Sanitize public_id to only allow safe characters
 * Only alphanumeric, dashes, and underscores allowed
 */
function sanitizePublicId(publicId: string): string {
  return publicId.replace(/[^a-zA-Z0-9_-]/g, "");
}

export const uploadController = {
  signUpload(req: Request, res: Response) {
    try {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        return res.status(500).json({ error: "Cloudinary is not configured" });
      }

      const { folder, public_id } = req.body || {};

      // Validate folder against allowlist
      if (folder && !ALLOWED_FOLDERS.includes(folder)) {
        return res.status(400).json({ 
          error: `Invalid folder. Allowed folders: ${ALLOWED_FOLDERS.join(", ")}` 
        });
      }

      // Sanitize public_id if provided
      const sanitizedPublicId = public_id ? sanitizePublicId(public_id) : undefined;
      if (public_id && sanitizedPublicId !== public_id) {
        console.warn(`Public ID sanitized: "${public_id}" -> "${sanitizedPublicId}"`);
      }

      const timestamp = Math.floor(Date.now() / 1000);

      // Build params to sign (alphabetical order)
      const params: Record<string, string | number> = { timestamp };
      if (folder) params.folder = folder;
      if (sanitizedPublicId) params.public_id = sanitizedPublicId;

      const toSign = Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&");

      const signature = crypto
        .createHash("sha1")
        .update(toSign + CLOUDINARY_API_SECRET)
        .digest("hex");

      return res.json({
        timestamp,
        signature,
        api_key: CLOUDINARY_API_KEY,
        cloud_name: CLOUDINARY_CLOUD_NAME,
        folder,
        public_id: sanitizedPublicId,
      });
    } catch (error) {
      console.error("Error generating Cloudinary signature:", error);
      return res.status(500).json({ error: "Failed to sign upload" });
    }
  },
};

