import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Better Auth - User Table
 * Core user table managed by Better Auth with custom platform-level fields
 */
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  // Custom fields for platform administration
  platformRole: text('platform_role', { enum: ['super_admin', 'operator', 'user'] }).notNull().default('user'),
  phone: text('phone'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  suspendedAt: integer('suspended_at', { mode: 'timestamp' }),
  suspendedReason: text('suspended_reason')
}, (table) => ({
  emailIdx: index('idx_user_email').on(table.email),
  platformRoleIdx: index('idx_user_platform_role').on(table.platformRole),
  isActiveIdx: index('idx_user_is_active').on(table.isActive)
}));

/**
 * Better Auth - Session Table
 * Manages user sessions with IP tracking
 */
export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  userIdIdx: index('idx_session_user_id').on(table.userId),
  expiresAtIdx: index('idx_session_expires_at').on(table.expiresAt)
}));

/**
 * Better Auth - Account Table
 * OAuth account linking and password storage
 */
export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'), // Hashed password for email/password auth
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  userIdIdx: index('idx_account_user_id').on(table.userId),
  providerIdx: index('idx_account_provider').on(table.providerId, table.accountId)
}));

/**
 * Better Auth - Verification Table
 * Email verification and password reset tokens
 */
export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  identifierIdx: index('idx_verification_identifier').on(table.identifier)
}));
