import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';

/**
 * Email Log Table
 * Records every email sent through the system for auditing and debugging.
 */
export const emailLog = sqliteTable('email_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipientEmail: text('recipient_email').notNull(),
  emailType: text('email_type', {
    enum: [
      'verification',
      'password_reset',
      'welcome',
      'rsvp_invitation',
      'rsvp_confirmation',
    ],
  }).notNull(),
  subject: text('subject').notNull(),
  status: text('status', { enum: ['sent', 'failed'] }).notNull(),
  resendId: text('resend_id'),
  errorMessage: text('error_message'),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  metadata: text('metadata'), // JSON text
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  recipientIdx: index('idx_email_log_recipient').on(table.recipientEmail),
  typeIdx: index('idx_email_log_type').on(table.emailType),
  userIdx: index('idx_email_log_user').on(table.userId),
  createdAtIdx: index('idx_email_log_created_at').on(table.createdAt),
}));

/**
 * Notification Settings Table
 * 1:1 with user. Controls which emails a user receives.
 */
export const notificationSettings = sqliteTable('notification_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  emailWelcome: integer('email_welcome', { mode: 'boolean' }).notNull().default(true),
  emailRsvpReceived: integer('email_rsvp_received', { mode: 'boolean' }).notNull().default(true),
  emailRsvpInvitation: integer('email_rsvp_invitation', { mode: 'boolean' }).notNull().default(true),
  emailRsvpConfirmation: integer('email_rsvp_confirmation', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  userIdx: index('idx_notification_settings_user').on(table.userId),
}));
