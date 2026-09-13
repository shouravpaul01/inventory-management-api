export interface IOtpEmailTemplateParams {
  name?: string;
  otp: string;
  expiresInMinutes?: number;
}

/**
 * Returns a styled, responsive HTML email template for OTP verification.
 */
export const getOtpEmailTemplate = ({
  name = "User",
  otp,
  expiresInMinutes = 5,
}: IOtpEmailTemplateParams): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 30px 15px;
          color: #1e293b;
        }
        .container {
          max-width: 520px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
        }
        .header {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          padding: 24px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 28px 24px;
        }
        .greeting {
          font-size: 15px;
          color: #334155;
          margin-bottom: 16px;
        }
        .message {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .otp-box {
          text-align: center;
          background: #f1f5f9;
          border: 2px dashed #cbd5e1;
          border-radius: 10px;
          padding: 20px 10px;
          margin: 20px 0;
        }
        .otp-code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 34px;
          font-weight: 800;
          color: #2563eb;
          letter-spacing: 8px;
          margin: 0;
        }
        .expiry-note {
          font-size: 12px;
          color: #64748b;
          margin-top: 8px;
          margin-bottom: 0;
        }
        .warning {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          border-top: 1px solid #f1f5f9;
          padding-top: 18px;
          margin-top: 24px;
        }
        .footer {
          background-color: #f8fafc;
          padding: 16px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Inventory Management System</h1>
        </div>
        <div class="content">
          <p class="greeting">Hello <strong>${name}</strong>,</p>
          <p class="message">We received a request to reset the password for your account. Please use the following One-Time Password (OTP) to proceed with your verification.</p>
          
          <div class="otp-box">
            <h2 class="otp-code">${otp}</h2>
            <p class="expiry-note">This code is valid for <strong>${expiresInMinutes} minutes</strong>.</p>
          </div>

          <p class="warning">If you did not request a password reset, please disregard this email or notify your system administrator immediately to secure your account.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Inventory Management System. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
};

export const EmailTemplateUtils = {
  getOtpEmailTemplate,
};
