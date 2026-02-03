import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';

/**
 * Organization Table
 * Organizations (companies/families) that can own events and have multiple members
 */
export const organization = sqliteTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  type: text('type', { enum: ['company', 'family'] }).notNull().default('company'),
  description: text('description'),
  logoUrl: text('logo_url'),
  website: text('website'),
  createdBy: text('created_by').notNull().references(() => user.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => ({
  slugIdx: index('idx_organization_slug').on(table.slug),
  typeIdx: index('idx_organization_type').on(table.type),
  createdByIdx: index('idx_organization_created_by').on(table.createdBy)
}));

/**
 * Organization Member Table
 * Junction table linking users to organizations with roles
 */
export const organizationMember = sqliteTable('organization_member', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['admin', 'member', 'viewer'] }).notNull().default('member'),
  invitedBy: text('invited_by').references(() => user.id, { onDelete: 'set null' }),
  invitedAt: integer('invited_at', { mode: 'timestamp' }),
  acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  orgIdIdx: index('idx_org_member_org_id').on(table.organizationId),
  userIdIdx: index('idx_org_member_user_id').on(table.userId),
  roleIdx: index('idx_org_member_role').on(table.role),
  uniqueOrgUser: unique('unique_org_user').on(table.organizationId, table.userId)
}));

/**
 * Organization Invitation Table
 * Pending invitations to join an organization
 */
export const organizationInvitation = sqliteTable('organization_invitation', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: ['admin', 'member', 'viewer'] }).notNull().default('member'),
  invitedBy: text('invited_by').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  orgIdIdx: index('idx_org_invitation_org_id').on(table.organizationId),
  emailIdx: index('idx_org_invitation_email').on(table.email),
  tokenIdx: index('idx_org_invitation_token').on(table.token)
}));
