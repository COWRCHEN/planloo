import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';

/**
 * Audit Log Table
 * Tracks all administrative actions for security and compliance
 */
export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actorId: text('actor_id').notNull().references(() => user.id),
  actorRole: text('actor_role', { enum: ['super_admin', 'operator'] }).notNull(),
  action: text('action').notNull(), // e.g., 'user.delete', 'user.suspend', 'org.delete'
  targetType: text('target_type'), // Entity type ('user', 'organization', 'event', etc.)
  targetId: text('target_id'), // ID of affected entity
  targetName: text('target_name'), // Name/email for readability
  details: text('details'), // JSON string with additional context
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  actorIdIdx: index('idx_audit_log_actor_id').on(table.actorId),
  actionIdx: index('idx_audit_log_action').on(table.action),
  targetIdx: index('idx_audit_log_target').on(table.targetType, table.targetId),
  createdAtIdx: index('idx_audit_log_created_at').on(table.createdAt)
}));

/**
 * Impersonation Session Table
 * Tracks when admins impersonate users for support
 */
export const impersonationSession = sqliteTable('impersonation_session', {
  id: text('id').primaryKey(),
  adminId: text('admin_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  targetUserId: text('target_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(), // Required reason for audit
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  ipAddress: text('ip_address')
}, (table) => ({
  adminIdIdx: index('idx_impersonation_admin_id').on(table.adminId),
  targetIdIdx: index('idx_impersonation_target_id').on(table.targetUserId),
  startedAtIdx: index('idx_impersonation_started_at').on(table.startedAt)
}));
