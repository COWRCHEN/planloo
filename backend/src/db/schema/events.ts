import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { organization } from './organization';

/**
 * Events Table
 * Core table for event data. Events can belong to a user (personal) or an organization
 */
export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }), // NULL if org event
  organizationId: text('organization_id').references(() => organization.id, { onDelete: 'cascade' }), // NULL if personal
  title: text('title').notNull(),
  description: text('description'),
  eventType: text('event_type', { enum: ['wedding', 'birthday', 'corporate', 'conference', 'other'] }),
  status: text('status', { enum: ['draft', 'planning', 'confirmed', 'completed', 'cancelled'] }).notNull().default('draft'),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  timezone: text('timezone').default('UTC'),
  locationName: text('location_name'),
  locationAddress: text('location_address'),
  locationCity: text('location_city'),
  locationState: text('location_state'),
  locationCountry: text('location_country'),
  locationPostalCode: text('location_postal_code'),
  locationLat: real('location_lat'),
  locationLng: real('location_lng'),
  guestCountExpected: integer('guest_count_expected'),
  guestCountConfirmed: integer('guest_count_confirmed').default(0),
  budgetTotal: real('budget_total'),
  budgetCurrency: text('budget_currency').default('USD'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false).notNull(),
  slug: text('slug').unique(),
  coverImageUrl: text('cover_image_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => ({
  userIdIdx: index('idx_events_user_id').on(table.userId),
  organizationIdIdx: index('idx_events_organization_id').on(table.organizationId),
  uuidIdx: index('idx_events_uuid').on(table.uuid),
  slugIdx: index('idx_events_slug').on(table.slug),
  statusIdx: index('idx_events_status').on(table.status),
  startDateIdx: index('idx_events_start_date').on(table.startDate),
  isPublicIdx: index('idx_events_is_public').on(table.isPublic)
}));

/**
 * Guests Table
 * Guest list management for each event
 */
export const guests = sqliteTable('guests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  email: text('email'),
  phone: text('phone'),
  category: text('category', { enum: ['vip', 'family', 'friend', 'colleague', 'other'] }),
  rsvpStatus: text('rsvp_status', { enum: ['pending', 'confirmed', 'declined', 'maybe'] }).default('pending'),
  rsvpToken: text('rsvp_token').unique(),
  rsvpRespondedAt: integer('rsvp_responded_at', { mode: 'timestamp' }),
  plusOnesAllowed: integer('plus_ones_allowed').default(0).notNull(),
  plusOnesCount: integer('plus_ones_count').default(0).notNull(),
  dietaryRestrictions: text('dietary_restrictions'),
  notes: text('notes'),
  checkedIn: integer('checked_in', { mode: 'boolean' }).default(false).notNull(),
  checkedInAt: integer('checked_in_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => ({
  eventIdIdx: index('idx_guests_event_id').on(table.eventId),
  uuidIdx: index('idx_guests_uuid').on(table.uuid),
  rsvpTokenIdx: index('idx_guests_rsvp_token').on(table.rsvpToken),
  rsvpStatusIdx: index('idx_guests_rsvp_status').on(table.rsvpStatus),
  emailIdx: index('idx_guests_email').on(table.email)
}));

/**
 * Event Collaborators Table
 * Users who can collaborate on an event (separate from organization membership)
 */
export const eventCollaborators = sqliteTable('event_collaborators', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'editor', 'viewer'] }).default('viewer').notNull(),
  invitedByUserId: text('invited_by_user_id').references(() => user.id, { onDelete: 'set null' }),
  invitedAt: integer('invited_at', { mode: 'timestamp' }),
  acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  eventIdIdx: index('idx_event_collaborators_event_id').on(table.eventId),
  userIdIdx: index('idx_event_collaborators_user_id').on(table.userId)
}));

/**
 * Tasks Table
 * Event checklist and task management
 */
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category'),
  assignedToUserId: text('assigned_to_user_id').references(() => user.id, { onDelete: 'set null' }),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium').notNull(),
  status: text('status', { enum: ['pending', 'in_progress', 'completed'] }).default('pending').notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => ({
  eventIdIdx: index('idx_tasks_event_id').on(table.eventId),
  uuidIdx: index('idx_tasks_uuid').on(table.uuid),
  statusIdx: index('idx_tasks_status').on(table.status),
  assignedToIdx: index('idx_tasks_assigned_to').on(table.assignedToUserId)
}));
