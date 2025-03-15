<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            text-align: center;
        }
        .container {
            max-width: 400px;
            margin: 50px auto;
            background: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
        }
        .otp-code {
            font-size: 24px;
            font-weight: bold;
            color: #007BFF;
            margin: 20px 0;
            letter-spacing: 4px;
        }
        .footer {
            font-size: 12px;
            color: #777;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <p class="title">Your OTP Code</p>
        <p class="otp-code">{{ $otpCode }}</p>
        <p>Please use this OTP to verify your email. The code will expire in 5 minutes.</p>
        <p class="footer">If you did not request this, please ignore this email.</p>
    </div>
</body>
</html>
