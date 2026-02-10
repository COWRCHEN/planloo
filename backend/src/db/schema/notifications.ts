import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { events } from './events';

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
  eventId: integer('event_id').references(() => events.id, { onDelete: 'set null' }),
  metadata: text('metadata'), // JSON text
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  recipientIdx: index('idx_email_log_recipient').on(table.recipientEmail),
  typeIdx: index('idx_email_log_type').on(table.emailType),
  userIdx: index('idx_email_log_user').on(table.userId),
  eventIdx: index('idx_email_log_event').on(table.eventId),
  createdAtIdx: index('idx_email_log_created_at').on(table.createdAt),
}));
