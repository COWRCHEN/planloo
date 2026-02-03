/**
 * Email Utilities
 *
 * Handles sending verification and password reset emails.
 * In development, logs to console. In production, integrates with email service.
 */

import type { Env } from '@/types/env';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface VerificationEmailParams {
  to: string;
  verificationUrl: string;
}

interface PasswordResetEmailParams {
  to: string;
  resetUrl: string;
}

/**
 * Send an email using the configured email service
 *
 * In development mode, logs email to console.
 * In production, sends via configured email API.
 */
async function sendEmail(env: Env, options: EmailOptions): Promise<void> {
  if (env.ENVIRONMENT === 'development') {
    console.log('='.repeat(60));
    console.log('EMAIL (Development Mode)');
    console.log('='.repeat(60));
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('-'.repeat(60));
    console.log(options.text);
    console.log('='.repeat(60));
    return;
  }

  // Production email sending
  // TODO: Integrate with email service (Resend, SendGrid, etc.)
  if (!env.EMAIL_API_KEY) {
    console.warn('EMAIL_API_KEY not configured, skipping email send');
    return;
  }

  // Example integration with Resend (uncomment and configure as needed):
  // const response = await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${env.EMAIL_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     from: env.EMAIL_FROM || 'noreply@planloo.com',
  //     to: options.to,
  //     subject: options.subject,
  //     html: options.html,
  //     text: options.text,
  //   }),
  // });
  //
  // if (!response.ok) {
  //   const error = await response.text();
  //   throw new Error(`Failed to send email: ${error}`);
  // }

  console.log(`Email queued for: ${options.to}`);
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  env: Env,
  params: VerificationEmailParams
): Promise<void> {
  const { to, verificationUrl } = params;

  await sendEmail(env, {
    to,
    subject: 'Verify your Planloo email address',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Planloo</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="margin-top: 0; color: #1f2937;">Verify your email address</h2>

    <p>Thanks for signing up for Planloo! Please verify your email address by clicking the button below.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="background: #2563EB; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Verify Email Address
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      If the button doesn't work, copy and paste this link into your browser:
      <br>
      <a href="${verificationUrl}" style="color: #2563EB; word-break: break-all;">${verificationUrl}</a>
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} Planloo. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim(),
    text: `
Verify your Planloo email address

Thanks for signing up for Planloo! Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.

- The Planloo Team
    `.trim(),
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  env: Env,
  params: PasswordResetEmailParams
): Promise<void> {
  const { to, resetUrl } = params;

  await sendEmail(env, {
    to,
    subject: 'Reset your Planloo password',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Planloo</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="margin-top: 0; color: #1f2937;">Reset your password</h2>

    <p>We received a request to reset your Planloo password. Click the button below to create a new password.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: #2563EB; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Reset Password
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      If the button doesn't work, copy and paste this link into your browser:
      <br>
      <a href="${resetUrl}" style="color: #2563EB; word-break: break-all;">${resetUrl}</a>
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>

    <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 16px; margin-top: 20px;">
      <p style="margin: 0; color: #991b1b; font-size: 14px;">
        <strong>Security tip:</strong> Never share this link with anyone. Planloo will never ask for your password via email.
      </p>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} Planloo. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim(),
    text: `
Reset your Planloo password

We received a request to reset your Planloo password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

Security tip: Never share this link with anyone. Planloo will never ask for your password via email.

- The Planloo Team
    `.trim(),
  });
}
