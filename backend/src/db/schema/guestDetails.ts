import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { guests } from './events';

/**
 * Guest Details Extension Tables
 *
 * These tables store event-type-specific guest information in a 1:1 relationship
 * with the base guests table. This approach allows for type-safe, indexable
 * event-specific fields without bloating the base guests table.
 */

// ==================== ENUMS ====================

export const WEDDING_GUEST_SIDES = ['bride', 'groom', 'both'] as const;
export const WEDDING_INVITED_TO = ['ceremony', 'reception', 'both'] as const;
export const AGE_GROUPS = ['child', 'teen', 'adult'] as const;
export const ATTENDEE_TYPES = ['employee', 'client', 'vendor', 'partner', 'other'] as const;
export const BADGE_TYPES = ['speaker', 'vip', 'standard', 'press', 'exhibitor', 'staff'] as const;

// ==================== WEDDING GUEST DETAILS ====================

/**
 * Wedding Guest Details Table
 *
 * Stores wedding-specific guest information:
 * - Which side of the wedding (bride/groom/both)
 * - What events invited to (ceremony/reception/both)
 * - Gift tracking with thank-you card status
 */
export const weddingGuestDetails = sqliteTable('wedding_guest_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guestId: integer('guest_id').notNull().unique().references(() => guests.id, { onDelete: 'cascade' }),

  // Which side of the wedding
  guestSide: text('guest_side', { enum: WEDDING_GUEST_SIDES }),

  // Invited to which events
  invitedTo: text('invited_to', { enum: WEDDING_INVITED_TO }).default('both'),

  // Wedding gift tracking
  weddingGiftDescription: text('wedding_gift_description'),
  weddingGiftThankYouSent: integer('wedding_gift_thank_you_sent', { mode: 'boolean' }).default(false).notNull(),

  // Shower gift tracking
  showerGiftDescription: text('shower_gift_description'),
  showerGiftThankYouSent: integer('shower_gift_thank_you_sent', { mode: 'boolean' }).default(false).notNull(),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  guestIdIdx: index('idx_wedding_guest_details_guest_id').on(table.guestId),
  guestSideIdx: index('idx_wedding_guest_details_side').on(table.guestSide),
  invitedToIdx: index('idx_wedding_guest_details_invited_to').on(table.invitedTo),
}));

// ==================== CORPORATE GUEST DETAILS ====================

/**
 * Corporate Guest Details Table
 *
 * Stores corporate event-specific guest information:
 * - Company and job information for badges
 * - Attendee type classification
 */
export const corporateGuestDetails = sqliteTable('corporate_guest_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guestId: integer('guest_id').notNull().unique().references(() => guests.id, { onDelete: 'cascade' }),

  companyName: text('company_name'),
  jobTitle: text('job_title'),
  department: text('department'),
  attendeeType: text('attendee_type', { enum: ATTENDEE_TYPES }),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  guestIdIdx: index('idx_corporate_guest_details_guest_id').on(table.guestId),
  companyNameIdx: index('idx_corporate_guest_details_company').on(table.companyName),
  attendeeTypeIdx: index('idx_corporate_guest_details_attendee_type').on(table.attendeeType),
}));

// ==================== CONFERENCE GUEST DETAILS ====================

/**
 * Conference Guest Details Table
 *
 * Stores conference-specific guest information:
 * - Badge type for access control
 * - Organization for networking
 * - Session registrations and attending days
 * - Special access privileges
 */
export const conferenceGuestDetails = sqliteTable('conference_guest_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guestId: integer('guest_id').notNull().unique().references(() => guests.id, { onDelete: 'cascade' }),

  badgeType: text('badge_type', { enum: BADGE_TYPES }).default('standard'),
  organization: text('organization'),

  // JSON array of session IDs: ["session-1", "session-2"]
  sessionRegistrations: text('session_registrations'),

  specialAccess: integer('special_access', { mode: 'boolean' }).default(false).notNull(),

  // JSON array of days: ["day1", "day2"]
  attendingDays: text('attending_days'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  guestIdIdx: index('idx_conference_guest_details_guest_id').on(table.guestId),
  badgeTypeIdx: index('idx_conference_guest_details_badge').on(table.badgeType),
  organizationIdx: index('idx_conference_guest_details_organization').on(table.organization),
}));

// ==================== BIRTHDAY GUEST DETAILS ====================

/**
 * Birthday Guest Details Table
 *
 * Stores birthday party-specific guest information:
 * - Relationship to the birthday person
 * - Age group for activity planning
 * - Gift contribution tracking for group gifts
 */
export const birthdayGuestDetails = sqliteTable('birthday_guest_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guestId: integer('guest_id').notNull().unique().references(() => guests.id, { onDelete: 'cascade' }),

  // e.g., "Friend", "Cousin", "Coworker"
  relationshipToBirthdayPerson: text('relationship_to_birthday_person'),

  ageGroup: text('age_group', { enum: AGE_GROUPS }),

  // Track group gift contributions
  giftContribution: real('gift_contribution'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  guestIdIdx: index('idx_birthday_guest_details_guest_id').on(table.guestId),
  ageGroupIdx: index('idx_birthday_guest_details_age_group').on(table.ageGroup),
}));
