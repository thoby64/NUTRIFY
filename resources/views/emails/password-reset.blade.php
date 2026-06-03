<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Nutriqube</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background-color: #f4f7f1;
            line-height: 1.6;
            color: #333;
        }
        
        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .email-header {
            background: linear-gradient(135deg, #157347 0%, #0f5f3c 100%);
            padding: 30px 20px;
            text-align: center;
            color: white;
        }
        
        .email-header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .email-header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .email-body {
            padding: 40px 30px;
        }
        
        .email-body h2 {
            font-size: 20px;
            color: #157347;
            margin-bottom: 16px;
        }
        
        .email-body p {
            margin-bottom: 16px;
            font-size: 14px;
            line-height: 1.8;
        }
        
        .user-name {
            font-weight: 600;
            color: #112118;
        }
        
        .reset-button-container {
            text-align: center;
            margin: 32px 0;
        }
        
        .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #157347 0%, #0f5f3c 100%);
            color: white;
            padding: 14px 40px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 15px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .reset-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(21, 115, 71, 0.3);
        }
        
        .reset-link {
            background-color: #f9fbf7;
            padding: 16px;
            border-radius: 6px;
            margin: 24px 0;
            border-left: 4px solid #157347;
            word-break: break-all;
            font-size: 12px;
            color: #526059;
            font-family: 'Courier New', monospace;
        }
        
        .email-footer {
            background-color: #f9fbf7;
            padding: 20px 30px;
            border-top: 1px solid #e0e7db;
            font-size: 12px;
            color: #526059;
            text-align: center;
        }
        
        .security-notice {
            background-color: #fef2f2;
            border: 1px solid #fca5a5;
            border-radius: 6px;
            padding: 16px;
            margin: 24px 0;
            font-size: 13px;
            color: #7f1d1d;
        }
        
        .security-notice strong {
            color: #b42318;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>🔐 Password Reset</h1>
            <p>Secure your Nutriqube account</p>
        </div>
        
        <div class="email-body">
            <h2>Hello <span class="user-name">{{ $user->full_name ?? $user->username }}</span>,</h2>
            
            <p>We received a request to reset your password for your Nutriqube account. If you didn't make this request, you can safely ignore this email.</p>
            
            <p><strong>Click the button below to reset your password:</strong></p>
            
            <div class="reset-button-container">
                <a href="{{ $resetLink }}" class="reset-button">Reset Your Password</a>
            </div>
            
            <p style="text-align: center; color: #999; font-size: 13px; margin-top: 16px;">Or copy and paste this link in your browser:</p>
            
            <div class="reset-link">{{ $resetLink }}</div>
            
            <div class="security-notice">
                <strong>Security Notice:</strong> This password reset link will expire in 1 hour. If you did not request this, please ignore this email or contact our support team immediately.
            </div>
            
            <p><strong>Why are you receiving this?</strong></p>
            <p>This email was sent because a password reset request was made for this email address on your Nutriqube account. Your account is secure until you use this link.</p>
        </div>
        
        <div class="email-footer">
            <p><strong>Nutriqube</strong> &mdash; Enterprise Nutrition Analytics</p>
            <p>If you have questions, please <a href="mailto:support@nutriqube.com" style="color: #157347; text-decoration: none;">contact our support team</a></p>
            <p style="margin-top: 12px; border-top: 1px solid #d0d7ca; padding-top: 12px;">
                © {{ date('Y') }} Nutriqube. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
