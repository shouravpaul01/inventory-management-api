
export const generateOTPEamilTemplate=(otp:number,name:string)=>`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Verification</title>
</head>
<body style="margin: 0; padding: 0;  font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
    <div style="background-color: #6d28d9; color: #ffffff; text-align: center; padding: 20px; font-size: 24px; font-weight: bold;">
      OTP Verification
    </div>
    <div style="padding: 20px; color: #333333; text-align: center;">
      <p style="margin: 10px 0; font-size: 16px; line-height: 1.6;">Dear ${name},</p>
      <p style="margin: 10px 0; font-size: 16px; line-height: 1.6;">Use the OTP below to complete your verification process:</p>
      <div style="font-size: 28px; font-weight: bold; color: #6d28d9; margin: 20px 0;">${otp}</div>
      <p style="margin: 10px 0; font-size: 16px; line-height: 1.6;">
        This OTP is valid for the next <strong>10 minutes</strong>. Please do not share it with anyone.
      </p>
      <p style="margin: 10px 0; font-size: 16px; line-height: 1.6;">
        If you did not request this OTP, please ignore this email or contact support.
      </p>
    </div>
    
  </div>
</body>
</html>
`;
  
