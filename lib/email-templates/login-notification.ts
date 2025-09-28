export const generateLoginNotificationTemplate = (
  userName: string,
  loginTime: string,
  ipAddress: string,
  deviceInfo: string,
  location: string
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Successful Login Notification</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
          color: #333;
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
        .logo {
          width: 150px;
          margin-bottom: 10px;
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
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .message {
          margin-bottom: 25px;
          line-height: 1.6;
        }
        .login-details {
          background-color: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          margin-bottom: 12px;
          border-bottom: 1px solid #eaeaea;
          padding-bottom: 12px;
        }
        .detail-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .detail-label {
          width: 40%;
          font-weight: 600;
          color: #555;
        }
        .detail-value {
          width: 60%;
        }
        .security-tip {
          background-color: #fff8e1;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
        }
        .button-container {
          text-align: center;
          margin: 25px 0;
        }
        .button {
          display: inline-block;
          background-color: #002E2C;
          color: white;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 4px;
          font-weight: 600;
          text-align: center;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #eee;
        }
        .social-links {
          margin: 15px 0;
        }
        .social-icon {
          display: inline-block;
          margin: 0 8px;
        }
        @media only screen and (max-width: 480px) {
          .detail-row {
            flex-direction: column;
          }
          .detail-label, .detail-value {
            width: 100%;
          }
          .detail-label {
            margin-bottom: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="email-wrapper">
          <div class="email-header">
            <h1>Rapid Steno</h1>
          </div>
          <div class="email-body">
            <div class="greeting">Hello ${userName},</div>
            <div class="message">
              <p>Your account was successfully accessed. We're sending this email to confirm it was you.</p>
            </div>
            
            <div class="login-details">
              <div class="detail-row">
                <div class="detail-label">Date & Time:</div>
                <div class="detail-value">${loginTime}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">IP Address:</div>
                <div class="detail-value">${ipAddress}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Device:</div>
                <div class="detail-value">${deviceInfo}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Location:</div>
                <div class="detail-value">${location}</div>
              </div>
            </div>
            
            <div class="security-tip">
              <strong>Security Tip:</strong> If you did not log in to your account at this time, please secure your account immediately by contacting us on info@rapidsteno.com or +91 73071 33551.
            </div>
            
            <p>Thank you for using Rapid Steno!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Rapid Steno. All rights reserved.</p>
            <p>Mail to info@rapidsteno.com</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};