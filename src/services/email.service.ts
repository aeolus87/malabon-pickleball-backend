import nodemailer from 'nodemailer';

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 587,
      secure: false,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"Malabon Pickleball" <noreply@${process.env.DOMAIN || 'malabonpickleballers.com'}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${emailData.to}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
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
