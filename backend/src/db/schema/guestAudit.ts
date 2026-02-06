import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { guests } from './events';

/**
 * Guest Audit Table
 * Tracks create/update history for guests: who changed what and when.
 * Used for dashboard "Audit" view; separate from admin audit_log.
 */
export const guestAudit = sqliteTable(
  'guest_audit',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    guestId: integer('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }), // null for RSVP self-updates
    action: text('action', { enum: ['create', 'update'] }).notNull(),
    details: text('details'), // JSON: { source?, changes?: [{ field, from, to }] }
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => ({
    guestIdIdx: index('idx_guest_audit_guest_id').on(table.guestId),
    createdAtIdx: index('idx_guest_audit_created_at').on(table.createdAt),
  })
);
