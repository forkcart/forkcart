import { baseLayout } from './base';

export interface PasswordResetData {
  customerName: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export function passwordResetHtml(data: PasswordResetData): string {
  const expiry = data.expiresInMinutes ?? 60;

  const content = `
    <h1>Reset Your Password</h1>
    <p>Hi ${data.customerName},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>

    <p style="text-align:center;margin:28px 0;">
      <a href="${data.resetUrl}" class="btn">🔑 Create New Password</a>
    </p>

    <p style="font-size:13px;color:#6b7280;">This link is valid for ${expiry} minutes.</p>

    <hr class="divider">
    <p style="font-size:13px;color:#6b7280;">If you did not request this, you can safely ignore this email. Your password will not be changed.</p>
  `;

  return baseLayout(content, 'Reset Your Password');
}

export function passwordResetText(data: PasswordResetData): string {
  const expiry = data.expiresInMinutes ?? 60;

  return `RESET YOUR PASSWORD

Hi ${data.customerName},

We received a request to reset your password.

Click the following link to create a new password:
${data.resetUrl}

This link is valid for ${expiry} minutes.

If you did not request this, you can safely ignore this email.

— ForkCart`;
}
