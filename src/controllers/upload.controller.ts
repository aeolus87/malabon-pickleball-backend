import { Request, Response } from "express";
import crypto from "crypto";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export const uploadController = {
  signUpload(req: Request, res: Response) {
    try {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        return res.status(500).json({ error: "Cloudinary is not configured" });
      }

      const { folder, public_id } = req.body || {};

      const timestamp = Math.floor(Date.now() / 1000);

      // Build params to sign (alphabetical order)
      const params: Record<string, string | number> = { timestamp };
      if (folder) params.folder = folder;
      if (public_id) params.public_id = public_id;

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
        public_id,
      });
    } catch (error) {
      console.error("Error generating Cloudinary signature:", error);
      return res.status(500).json({ error: "Failed to sign upload" });
    }
  },
};

