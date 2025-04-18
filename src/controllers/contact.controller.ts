import { Request, Response } from "express";
import nodemailer from "nodemailer";
import { validationResult, body } from "express-validator";
import xss from "xss";
import dotenv from "dotenv";

dotenv.config();

// Create email transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const contactValidationRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .escape(),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail(),
  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Subject must be between 2 and 100 characters")
    .escape(),
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Message must be between 10 and 1000 characters")
    .escape(),
];

export const contactController = {
  async submitContactForm(req: Request, res: Response) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Get sanitized input from validated request
      const { name, email, subject, message } = req.body;

      // Additional sanitization as defense in depth
      const sanitizedName = xss(name);
      const sanitizedEmail = xss(email);
      const sanitizedSubject = xss(subject);
      const sanitizedMessage = xss(message);

      // Define recipient email (from environment or fallback)
      const toEmail =
        process.env.CONTACT_EMAIL || "info@malabonpickleballers.com";

      // Create email transport
      const transporter = createTransporter();

      // Email content
      const mailOptions = {
        from:
          process.env.EMAIL_FROM ||
          '"Malabon Pickleballers Contact" <noreply@malabonpickleballers.com>',
        to: toEmail,
        replyTo: sanitizedEmail,
        subject: `Contact Form: ${sanitizedSubject}`,
        text: `
Name: ${sanitizedName}
Email: ${sanitizedEmail}
Subject: ${sanitizedSubject}

Message:
${sanitizedMessage}

---
This message was sent from the contact form on the Malabon Pickleballers website.
`,
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2c5282;">New Contact Form Submission</h2>
  <p><strong>Name:</strong> ${sanitizedName}</p>
  <p><strong>Email:</strong> ${sanitizedEmail}</p>
  <p><strong>Subject:</strong> ${sanitizedSubject}</p>
  <hr style="border: 1px solid #edf2f7;">
  <h3 style="color: #4a5568;">Message:</h3>
  <div style="padding: 15px; background-color: #f7fafc; border-radius: 5px;">
    ${sanitizedMessage.replace(/\n/g, "<br>")}
  </div>
  <p style="color: #718096; font-size: 0.875rem; margin-top: 20px;">
    This message was sent from the contact form on the Malabon Pickleballers website.
  </p>
</div>
`,
      };

      // Log the attempt (but not the full content for privacy)
      console.log(
        `Sending contact email from ${sanitizedEmail} with subject: ${sanitizedSubject}`
      );

      // Send email
      await transporter.sendMail(mailOptions);

      // Also send confirmation email to the user
      const confirmationMailOptions = {
        from:
          process.env.EMAIL_FROM ||
          '"Malabon Pickleballers" <noreply@malabonpickleballers.com>',
        to: sanitizedEmail,
        subject: "We've received your message",
        text: `
Dear ${sanitizedName},

Thank you for contacting the Malabon Pickleballers. We have received your message and will get back to you as soon as possible.

For reference, here's a copy of your message:

Subject: ${sanitizedSubject}
Message:
${sanitizedMessage}

Best regards,
The Malabon Pickleballers Team
`,
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2c5282;">Thank You for Contacting Us</h2>
  <p>Dear ${sanitizedName},</p>
  <p>Thank you for contacting the Malabon Pickleballers. We have received your message and will get back to you as soon as possible.</p>
  <p>For reference, here's a copy of your message:</p>
  <div style="padding: 15px; background-color: #f7fafc; border-radius: 5px; margin: 15px 0;">
    <p><strong>Subject:</strong> ${sanitizedSubject}</p>
    <p><strong>Message:</strong></p>
    <p>${sanitizedMessage.replace(/\n/g, "<br>")}</p>
  </div>
  <p>Best regards,<br>The Malabon Pickleballers Team</p>
</div>
`,
      };

      await transporter.sendMail(confirmationMailOptions);

      return res.status(200).json({
        success: true,
        message:
          "Your message has been sent successfully. We'll get back to you soon!",
      });
    } catch (error) {
      console.error("Error sending contact email:", error);
      return res.status(500).json({
        success: false,
        message: "We couldn't send your message. Please try again later.",
      });
    }
  },
};
