/**
 * Email Utilities
 *
 * Handles sending transactional emails via Resend.
 * In development, logs to console. In production, sends via Resend API.
 */

import type { Env } from '@/types/env';
import type { DbClient } from '@/db/client';
import type { EmailType } from '@/db/types';
import { schema } from '@/db';

// ==================== TYPES ====================

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

interface WelcomeEmailParams {
  to: string;
  userName: string;
}

interface RsvpInvitationEmailParams {
  to: string;
  guestName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string | null;
  rsvpUrl: string;
}

interface RsvpConfirmationEmailParams {
  to: string;
  guestName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string | null;
  rsvpStatus: 'confirmed' | 'declined' | 'maybe';
}

// ==================== BASE TEMPLATE ====================

function baseEmailTemplate(title: string, bodyHtml: string, bodyText: string, options?: { unsubscribeNote?: boolean }): { html: string; text: string } {
  const unsubscribeHtml = options?.unsubscribeNote
    ? `<p style="color: #9ca3af; font-size: 11px; margin-top: 12px;">You can manage your email preferences in your <a href="#" style="color: #9ca3af;">notification settings</a>.</p>`
    : '';
  const unsubscribeText = options?.unsubscribeNote
    ? '\n\nYou can manage your email preferences in your notification settings.'
    : '';

  const html = `
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
    ${bodyHtml}
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} Planloo. All rights reserved.</p>
    ${unsubscribeHtml}
  </div>
</body>
</html>
  `.trim();

  const text = `${title}\n\n${bodyText}\n\n- The Planloo Team${unsubscribeText}`;

  return { html, text };
}

// ==================== SEND EMAIL ====================

/**
 * Send an email using Resend (or log in development).
 * Returns the Resend email ID if available.
 */
async function sendEmail(env: Env, options: EmailOptions): Promise<{ id?: string | undefined }> {
  if (env.ENVIRONMENT === 'development') {
    console.log('='.repeat(60));
    console.log('EMAIL (Development Mode)');
    console.log('='.repeat(60));
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('-'.repeat(60));
    console.log(options.text);
    console.log('='.repeat(60));
    return {};
  }

  if (!env.EMAIL_API_KEY) {
    console.warn('EMAIL_API_KEY not configured, skipping email send');
    return {};
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.EMAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || 'Planloo <noreply@planloo.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = (errorData as { message?: string }).message || 'Unknown error';
    console.error('Email send failed:', errorMessage);
    throw new Error(`Failed to send email: ${errorMessage}`);
  }

  const result = await response.json().catch(() => ({})) as { id?: string };
  console.log(`Email sent successfully to: ${options.to}`);
  return { id: result.id ?? undefined };
}

// ==================== EMAIL LOGGING ====================

/**
 * Log an email send attempt to the database.
 * Best-effort — failures are logged but don't throw.
 */
export async function logEmail(params: {
  db: DbClient;
  recipientEmail: string;
  emailType: EmailType;
  subject: string;
  status: 'sent' | 'failed';
  resendId?: string | undefined;
  errorMessage?: string | undefined;
  userId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}): Promise<void> {
  try {
    await params.db.insert(schema.emailLog).values({
      recipientEmail: params.recipientEmail,
      emailType: params.emailType,
      subject: params.subject,
      status: params.status,
      resendId: params.resendId ?? null,
      errorMessage: params.errorMessage ?? null,
      userId: params.userId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    });
  } catch (err) {
    console.error('Failed to log email:', err);
  }
}

// ==================== EMAIL FUNCTIONS ====================

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  env: Env,
  params: VerificationEmailParams
): Promise<{ id?: string | undefined }> {
  const { to, verificationUrl } = params;

  const { html, text } = baseEmailTemplate(
    'Verify your email address',
    `
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
    `,
    `Thanks for signing up for Planloo! Please verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.`
  );

  return sendEmail(env, {
    to,
    subject: 'Verify your Planloo email address',
    html,
    text,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  env: Env,
  params: PasswordResetEmailParams
): Promise<{ id?: string | undefined }> {
  const { to, resetUrl } = params;

  const { html, text } = baseEmailTemplate(
    'Reset your password',
    `
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
    `,
    `We received a request to reset your Planloo password. Click the link below to create a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.\n\nSecurity tip: Never share this link with anyone. Planloo will never ask for your password via email.`
  );

  return sendEmail(env, {
    to,
    subject: 'Reset your Planloo password',
    html,
    text,
  });
}

/**
 * Send welcome email after user registration
 */
export async function sendWelcomeEmail(
  env: Env,
  params: WelcomeEmailParams
): Promise<{ id?: string | undefined }> {
  const { to, userName } = params;
  const dashboardUrl = `${env.FRONTEND_URL}/dashboard`;

  const { html, text } = baseEmailTemplate(
    'Welcome to Planloo!',
    `
    <h2 style="margin-top: 0; color: #1f2937;">Welcome to Planloo, ${userName}!</h2>
    <p>We're excited to have you on board. Planloo makes event planning simple and stress-free.</p>
    <p>Here's what you can do:</p>
    <ul style="color: #4b5563; padding-left: 20px;">
      <li>Create and manage events</li>
      <li>Track your guest list and RSVPs</li>
      <li>Manage budgets and vendors</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}" style="background: #2563EB; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Go to Dashboard
      </a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">If you have any questions, feel free to reach out. Happy planning!</p>
    `,
    `Welcome to Planloo, ${userName}!\n\nWe're excited to have you on board. Planloo makes event planning simple and stress-free.\n\nHere's what you can do:\n- Create and manage events\n- Track your guest list and RSVPs\n- Manage budgets and vendors\n\nGet started: ${dashboardUrl}\n\nIf you have any questions, feel free to reach out. Happy planning!`,
    { unsubscribeNote: true }
  );

  return sendEmail(env, {
    to,
    subject: 'Welcome to Planloo!',
    html,
    text,
  });
}

/**
 * Send RSVP invitation email to a guest
 */
export async function sendRsvpInvitationEmail(
  env: Env,
  params: RsvpInvitationEmailParams
): Promise<{ id?: string | undefined }> {
  const { to, guestName, eventTitle, eventDate, eventLocation, rsvpUrl } = params;

  const locationHtml = eventLocation
    ? `<p style="color: #4b5563; margin: 4px 0;">📍 ${eventLocation}</p>`
    : '';
  const locationText = eventLocation ? `Location: ${eventLocation}\n` : '';

  const { html, text } = baseEmailTemplate(
    `You're invited: ${eventTitle}`,
    `
    <h2 style="margin-top: 0; color: #1f2937;">You're Invited!</h2>
    <p>Hi ${guestName},</p>
    <p>You've been invited to <strong>${eventTitle}</strong>.</p>
    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #4b5563; margin: 4px 0;">📅 ${eventDate}</p>
      ${locationHtml}
    </div>
    <p>Please let us know if you can make it by responding to this invitation.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${rsvpUrl}" style="background: #2563EB; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Respond to Invitation
      </a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">
      If the button doesn't work, copy and paste this link into your browser:
      <br>
      <a href="${rsvpUrl}" style="color: #2563EB; word-break: break-all;">${rsvpUrl}</a>
    </p>
    `,
    `Hi ${guestName},\n\nYou've been invited to ${eventTitle}.\n\nDate: ${eventDate}\n${locationText}\nPlease respond to this invitation:\n${rsvpUrl}`,
    { unsubscribeNote: true }
  );

  return sendEmail(env, {
    to,
    subject: `You're invited: ${eventTitle}`,
    html,
    text,
  });
}

/**
 * Send RSVP confirmation email after a guest responds
 */
export async function sendRsvpConfirmationEmail(
  env: Env,
  params: RsvpConfirmationEmailParams
): Promise<{ id?: string | undefined }> {
  const { to, guestName, eventTitle, eventDate, eventLocation, rsvpStatus } = params;

  const statusLabels: Record<string, string> = {
    confirmed: 'Confirmed',
    declined: 'Declined',
    maybe: 'Maybe',
  };
  const statusLabel = statusLabels[rsvpStatus] ?? rsvpStatus;

  const statusColors: Record<string, string> = {
    confirmed: '#059669',
    declined: '#dc2626',
    maybe: '#d97706',
  };
  const statusColor = statusColors[rsvpStatus] ?? '#6b7280';

  const locationHtml = eventLocation
    ? `<p style="color: #4b5563; margin: 4px 0;">📍 ${eventLocation}</p>`
    : '';
  const locationText = eventLocation ? `Location: ${eventLocation}\n` : '';

  const { html, text } = baseEmailTemplate(
    `RSVP ${statusLabel}: ${eventTitle}`,
    `
    <h2 style="margin-top: 0; color: #1f2937;">RSVP ${statusLabel}</h2>
    <p>Hi ${guestName},</p>
    <p>Your response for <strong>${eventTitle}</strong> has been recorded.</p>
    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: 600;">${statusLabel}</span></p>
      <p style="color: #4b5563; margin: 4px 0;">📅 ${eventDate}</p>
      ${locationHtml}
    </div>
    ${rsvpStatus === 'confirmed' ? '<p>We look forward to seeing you there!</p>' : ''}
    ${rsvpStatus === 'maybe' ? '<p>We hope you can make it! You can update your response at any time.</p>' : ''}
    <p style="color: #6b7280; font-size: 14px;">If you need to change your response, use the original invitation link.</p>
    `,
    `Hi ${guestName},\n\nYour RSVP for ${eventTitle} has been recorded.\n\nStatus: ${statusLabel}\nDate: ${eventDate}\n${locationText}\nIf you need to change your response, use the original invitation link.`,
    { unsubscribeNote: true }
  );

  return sendEmail(env, {
    to,
    subject: `RSVP ${statusLabel}: ${eventTitle}`,
    html,
    text,
  });
}
