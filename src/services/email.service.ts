import { Resend } from 'resend';

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY is not set. Email functionality will be disabled.');
    }
    this.resend = new Resend(apiKey);
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not configured');
        return false;
      }

      const domain = process.env.DOMAIN || 'malabonpickleballers.com';
      const from = `Malabon Pickleball <noreply@${domain}>`;

      await this.resend.emails.send({
        from,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
      });

      console.log(`Email sent successfully to ${emailData.to}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string, code: string, name: string): Promise<boolean> {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verificationLink = `${clientUrl}/verify-email?token=${token}`;
    const domain = process.env.DOMAIN || 'malabonpickleballers.com';

    const subject = 'Verify your email address - Malabon Pickleball';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background-color: #f0fdf4;
            padding: 0;
            margin: 0;
          }
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 48px 40px 40px;
            text-align: center;
          }
          .logo {
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.5px;
            margin-bottom: 8px;
          }
          .logo-subtitle {
            font-size: 15px;
            color: rgba(255, 255, 255, 0.95);
            font-weight: 400;
            letter-spacing: 0.3px;
          }
          .content {
            padding: 48px 40px;
          }
          .title {
            font-size: 26px;
            font-weight: 700;
            color: #065f46;
            margin-bottom: 20px;
            line-height: 1.3;
          }
          .greeting {
            font-size: 16px;
            color: #374151;
            margin-bottom: 36px;
            line-height: 1.7;
          }
          .code-container {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border: 2px solid #10b981;
            border-radius: 16px;
            padding: 36px 28px;
            text-align: center;
            margin: 36px 0;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
          }
          .code-label {
            font-size: 12px;
            color: #047857;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
            margin-bottom: 20px;
          }
          .code {
            font-size: 40px;
            font-weight: 700;
            color: #059669;
            letter-spacing: 10px;
            font-family: 'Courier New', monospace;
            margin: 12px 0;
            line-height: 1.2;
          }
          .code-expiry {
            font-size: 13px;
            color: #047857;
            margin-top: 16px;
            font-weight: 500;
          }
          .divider {
            height: 1px;
            background: #d1fae5;
            margin: 36px 0;
            position: relative;
          }
          .divider-text {
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            background: #ffffff;
            padding: 0 20px;
            font-size: 13px;
            color: #059669;
            font-weight: 600;
          }
          .button-container {
            text-align: center;
            margin: 36px 0;
          }
          .button {
            display: inline-block;
            padding: 16px 40px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }
          .button:hover {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
            transform: translateY(-1px);
          }
          .link-section {
            background: #f0fdf4;
            border: 1px solid #d1fae5;
            border-radius: 12px;
            padding: 24px;
            margin: 28px 0;
          }
          .link-label {
            font-size: 13px;
            color: #047857;
            margin-bottom: 10px;
            font-weight: 600;
          }
          .link {
            color: #059669;
            word-break: break-all;
            font-size: 13px;
            text-decoration: none;
            font-weight: 500;
          }
          .link:hover {
            color: #047857;
            text-decoration: underline;
          }
          .disclaimer {
            font-size: 13px;
            color: #6b7280;
            margin-top: 36px;
            padding-top: 28px;
            border-top: 1px solid #d1fae5;
            line-height: 1.6;
          }
          .footer {
            background: #f0fdf4;
            padding: 36px 40px;
            text-align: center;
            border-top: 1px solid #d1fae5;
          }
          .footer-text {
            font-size: 14px;
            color: #047857;
            line-height: 1.7;
            margin-bottom: 10px;
            font-weight: 500;
          }
          .footer-text:last-child {
            margin-bottom: 0;
          }
          @media only screen and (max-width: 600px) {
            .content {
              padding: 36px 24px;
            }
            .header {
              padding: 40px 24px 32px;
            }
            .code {
              font-size: 32px;
              letter-spacing: 8px;
            }
            .footer {
              padding: 28px 24px;
            }
            .title {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <div class="logo">Malabon Pickleball</div>
            <div class="logo-subtitle">Community & Venues</div>
          </div>
          
          <div class="content">
            <h1 class="title">Verify Your Email Address</h1>
            
            <p class="greeting">
              Hi ${name},<br><br>
              Thank you for registering with Malabon Pickleball. To complete your registration and start using your account, please verify your email address using the code below.
            </p>
            
            <div class="code-container">
              <div class="code-label">Verification Code</div>
              <div class="code">${code}</div>
              <div class="code-expiry">This code will expire in 24 hours</div>
            </div>
            
            <div class="divider">
              <span class="divider-text">OR</span>
            </div>
            
            <div class="button-container">
              <a href="${verificationLink}" class="button" style="color: #ffffff; text-decoration: none;">Verify via Link</a>
            </div>
            
            <div class="link-section">
              <div class="link-label">Alternative verification link:</div>
              <a href="${verificationLink}" class="link">${verificationLink}</a>
            </div>
            
            <p class="disclaimer">
              If you didn't create an account with us, please ignore this email. This verification link will expire in 24 hours.
            </p>
          </div>
          
          <div class="footer">
            <p class="footer-text">Thank you for being part of the Malabon Pickleball community.</p>
            <p class="footer-text">If you have any questions, please don't hesitate to contact us.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  async sendAttendanceConfirmation(
    userEmail: string,
    userName: string,
    venueName: string,
    venueDate?: string
  ): Promise<boolean> {
    const subject = `You're confirmed for ${venueName}! 🏓`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Attendance Confirmed</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 20px;
          }
          .message {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 30px;
          }
          .venue-info {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .venue-name {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
          }
          .venue-date {
            color: #6b7280;
            font-size: 14px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .emoji {
            font-size: 24px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Malabon Pickleball</div>
            <div class="emoji">🏓</div>
          </div>
          
          <div class="title">You're all set!</div>
          
          <div class="message">
            Hi ${userName},<br><br>
            Great news! Your attendance has been confirmed for the upcoming pickleball session.
          </div>
          
          <div class="venue-info">
            <div class="venue-name">${venueName}</div>
            ${venueDate ? `<div class="venue-date">📅 ${venueDate}</div>` : ''}
          </div>
          
          <div class="message">
            We're excited to see you there! Make sure to bring your paddle and get ready for some great games.
          </div>
          
          <div class="footer">
            <p>Thanks for being part of the Malabon Pickleball community!</p>
            <p>If you need to cancel, please do so at least 24 hours in advance.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }
}

export const emailService = new EmailService();
