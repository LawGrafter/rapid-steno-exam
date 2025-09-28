import nodemailer from 'nodemailer';
import { generateLoginNotificationTemplate } from './email-templates/login-notification';

// Email configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'info@rapidsteno.com',
    pass: process.env.SMTP_PASS || 'trxzuevlbihblyki',
  },
});

// OTP HTML email template
export const generateOtpEmailTemplate = (otp: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP Code</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .email-wrapper {
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        .email-header {
          background-color: #002E2C;
          padding: 20px;
          text-align: center;
        }
        .email-header h1 {
          color: white;
          margin: 0;
          font-size: 24px;
        }
        .email-body {
          padding: 30px;
          color: #333;
        }
        .otp-container {
          margin: 30px 0;
          text-align: center;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #002E2C;
          padding: 15px 25px;
          background-color: #f5f5f5;
          border-radius: 8px;
          display: inline-block;
        }
        .message {
          margin-bottom: 20px;
          line-height: 1.6;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #eee;
        }
        .note {
          font-size: 14px;
          color: #777;
          font-style: italic;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="email-wrapper">
          <div class="email-header">
            <h1>Rapid Steno Verification</h1>
          </div>
          <div class="email-body">
            <div class="message">
              <p>Hello,</p>
              <p>Thank you for logging in to Rapid Steno. To complete your login, please use the following One-Time Password (OTP):</p>
            </div>
            <div class="otp-container">
              <div class="otp-code">${otp}</div>
            </div>
            <div class="message">
              <p>This OTP is valid for 10 minutes. Please do not share this code with anyone.</p>
            </div>
            <div class="note">
              <p>If you did not request this OTP, please ignore this email.</p>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Rapid Steno. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Function to send OTP email
export const sendOtpEmail = async (email: string, otp: string) => {
  try {
    const mailOptions = {
      from: process.env.ADMIN_EMAIL || 'info@rapidsteno.com',
      to: email,
      subject: 'Your Rapid Steno Login OTP',
      html: generateOtpEmailTemplate(otp),
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error };
  }
};

// Function to send login notification email
export const sendLoginNotificationEmail = async (
  email: string,
  userName: string,
  ipAddress: string,
  deviceInfo: string,
  location: string = 'Unknown'
) => {
  try {
    // Format the login time
    const loginTime = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const mailOptions = {
      from: process.env.ADMIN_EMAIL || 'info@rapidsteno.com',
      to: email,
      subject: 'Successful Login to Rapid Steno',
      html: generateLoginNotificationTemplate(
        userName,
        loginTime,
        ipAddress,
        deviceInfo,
        location
      ),
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending login notification email:', error);
    return { success: false, error };
  }
};