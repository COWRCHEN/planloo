import { relations } from 'drizzle-orm';
import { user, session, account } from './auth';
import { organization, organizationMember, organizationInvitation } from './organization';
import { events, guests, eventCollaborators, tasks, eventGuestSettings, eventRsvpSettings, eventPrivacySettings } from './events';
import {
  weddingGuestDetails,
  corporateGuestDetails,
  conferenceGuestDetails,
  birthdayGuestDetails,
} from './guestDetails';
import { budgetItems, payments } from './budget';
import { serviceProviders, venues, eventServiceProviders, eventVenues, reviews } from './providers';
import { auditLog, impersonationSession } from './admin';
import { guestAudit } from './guestAudit';
import { emailLog } from './notifications';
import { floorPlans, floorPlanObjects, seatAssignments, guestRelationships, objectTemplates } from './floorPlan';

/**
 * User Relations
 */
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  organizationMemberships: many(organizationMember, { relationName: 'memberOrganizationMemberships' }),
  organizationsCreated: many(organization),
  personalEvents: many(events),
  eventCollaborations: many(eventCollaborators, { relationName: 'eventCollaboratorAsUser' }),
  eventCollaborationsInvited: many(eventCollaborators, { relationName: 'eventCollaboratorAsInviter' }),
  tasksAssigned: many(tasks),
  serviceProviders: many(serviceProviders),
  venues: many(venues),
  reviews: many(reviews),
  auditLogs: many(auditLog),
  guestAuditEntries: many(guestAudit),
  impersonationSessionsAsAdmin: many(impersonationSession, { relationName: 'impersonationAdmin' }),
  impersonationSessionsAsTarget: many(impersonationSession, { relationName: 'impersonationTarget' }),
  emailLogs: many(emailLog),
}));

/**
 * Session Relations
 */
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  })
}));

/**
 * Account Relations
 */
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  })
}));

/**
 * Organization Relations
 */
export const organizationRelations = relations(organization, ({ one, many }) => ({
  creator: one(user, {
    fields: [organization.createdBy],
    references: [user.id]
  }),
  members: many(organizationMember),
  invitations: many(organizationInvitation),
  events: many(events)
}));

/**
 * Organization Member Relations
 */
export const organizationMemberRelations = relations(organizationMember, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationMember.organizationId],
    references: [organization.id]
  }),
  user: one(user, {
    fields: [organizationMember.userId],
    references: [user.id],
    relationName: 'memberOrganizationMemberships'
  }),
  inviter: one(user, {
    fields: [organizationMember.invitedBy],
    references: [user.id],
    relationName: 'inviterOrganizationMemberships'
  })
}));

/**
 * Organization Invitation Relations
 */
export const organizationInvitationRelations = relations(organizationInvitation, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationInvitation.organizationId],
    references: [organization.id]
  }),
  inviter: one(user, {
    fields: [organizationInvitation.invitedBy],
    references: [user.id]
  })
}));

/**
 * Events Relations
 */
export const eventsRelations = relations(events, ({ one, many }) => ({
  owner: one(user, {
    fields: [events.userId],
    references: [user.id]
  }),
  organization: one(organization, {
    fields: [events.organizationId],
    references: [organization.id]
  }),
  guests: many(guests),
  collaborators: many(eventCollaborators),
  tasks: many(tasks),
  budgetItems: many(budgetItems),
  serviceProviders: many(eventServiceProviders),
  venues: many(eventVenues),
  reviews: many(reviews),
  // Guest field settings (1:1)
  guestSettings: one(eventGuestSettings, {
    fields: [events.id],
    references: [eventGuestSettings.eventId]
  }),
  // RSVP settings (1:1)
  rsvpSettings: one(eventRsvpSettings, {
    fields: [events.id],
    references: [eventRsvpSettings.eventId]
  }),
  // Privacy settings (1:1)
  privacySettings: one(eventPrivacySettings, {
    fields: [events.id],
    references: [eventPrivacySettings.eventId]
  }),
  emailLogs: many(emailLog),
  floorPlans: many(floorPlans),
  guestRelationships: many(guestRelationships),
  objectTemplates: many(objectTemplates),
}));

/**
 * Guests Relations
 */
export const guestsRelations = relations(guests, ({ one, many }) => ({
  event: one(events, {
    fields: [guests.eventId],
    references: [events.id]
  }),
  auditEntries: many(guestAudit),
  seatAssignments: many(seatAssignments),
  // Event-type-specific detail tables (1:1, only one will be populated based on event type)
  weddingDetails: one(weddingGuestDetails, {
    fields: [guests.id],
    references: [weddingGuestDetails.guestId]
  }),
  corporateDetails: one(corporateGuestDetails, {
    fields: [guests.id],
    references: [corporateGuestDetails.guestId]
  }),
  conferenceDetails: one(conferenceGuestDetails, {
    fields: [guests.id],
    references: [conferenceGuestDetails.guestId]
  }),
  birthdayDetails: one(birthdayGuestDetails, {
    fields: [guests.id],
    references: [birthdayGuestDetails.guestId]
  }),
}));

/**
 * Event Collaborators Relations
 * Disambiguated: user (collaborator) vs inviter (who invited them)
 */
export const eventCollaboratorsRelations = relations(eventCollaborators, ({ one }) => ({
  event: one(events, {
    fields: [eventCollaborators.eventId],
    references: [events.id]
  }),
  user: one(user, {
    fields: [eventCollaborators.userId],
    references: [user.id],
    relationName: 'eventCollaboratorAsUser'
  }),
  inviter: one(user, {
    fields: [eventCollaborators.invitedByUserId],
    references: [user.id],
    relationName: 'eventCollaboratorAsInviter'
  })
}));

/**
 * Tasks Relations
 */
export const tasksRelations = relations(tasks, ({ one }) => ({
  event: one(events, {
    fields: [tasks.eventId],
    references: [events.id]
  }),
  assignedTo: one(user, {
    fields: [tasks.assignedToUserId],
    references: [user.id]
  })
}));

/**
 * Budget Items Relations
 */
export const budgetItemsRelations = relations(budgetItems, ({ one, many }) => ({
  event: one(events, {
    fields: [budgetItems.eventId],
    references: [events.id]
  }),
  serviceProvider: one(serviceProviders, {
    fields: [budgetItems.serviceProviderId],
    references: [serviceProviders.id]
  }),
  payments: many(payments)
}));

/**
 * Payments Relations
 */
export const paymentsRelations = relations(payments, ({ one }) => ({
  budgetItem: one(budgetItems, {
    fields: [payments.budgetItemId],
    references: [budgetItems.id]
  })
}));

/**
 * Service Providers Relations
 * Note: reviews table uses polymorphic entityType/entityId (no FK to service_providers).
 * Query reviews manually: where entityType = 'service_provider' and entityId = id.
 */
export const serviceProvidersRelations = relations(serviceProviders, ({ one, many }) => ({
  user: one(user, {
    fields: [serviceProviders.userId],
    references: [user.id]
  }),
  eventBookings: many(eventServiceProviders),
  budgetItems: many(budgetItems)
}));

/**
 * Venues Relations
 * Note: reviews table uses polymorphic entityType/entityId (no FK to venues).
 * Query reviews manually: where entityType = 'venue' and entityId = id.
 */
export const venuesRelations = relations(venues, ({ one, many }) => ({
  user: one(user, {
    fields: [venues.userId],
    references: [user.id]
  }),
  eventBookings: many(eventVenues)
}));

/**
 * Event Service Providers Relations
 */
export const eventServiceProvidersRelations = relations(eventServiceProviders, ({ one }) => ({
  event: one(events, {
    fields: [eventServiceProviders.eventId],
    references: [events.id]
  }),
  serviceProvider: one(serviceProviders, {
    fields: [eventServiceProviders.serviceProviderId],
    references: [serviceProviders.id]
  })
}));

/**
 * Event Venues Relations
 */
export const eventVenuesRelations = relations(eventVenues, ({ one }) => ({
  event: one(events, {
    fields: [eventVenues.eventId],
    references: [events.id]
  }),
  venue: one(venues, {
    fields: [eventVenues.venueId],
    references: [venues.id]
  })
}));

/**
 * Reviews Relations
 */
export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(user, {
    fields: [reviews.userId],
    references: [user.id]
  }),
  event: one(events, {
    fields: [reviews.eventId],
    references: [events.id]
  })
}));

/**
 * Guest Audit Relations
 */
export const guestAuditRelations = relations(guestAudit, ({ one }) => ({
  guest: one(guests, {
    fields: [guestAudit.guestId],
    references: [guests.id]
  }),
  user: one(user, {
    fields: [guestAudit.userId],
    references: [user.id]
  })
}));

/**
 * Audit Log Relations
 */
export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(user, {
    fields: [auditLog.actorId],
    references: [user.id]
  })
}));

/**
 * Impersonation Session Relations
 */
export const impersonationSessionRelations = relations(impersonationSession, ({ one }) => ({
  admin: one(user, {
    fields: [impersonationSession.adminId],
    references: [user.id],
    relationName: 'impersonationAdmin'
  }),
  targetUser: one(user, {
    fields: [impersonationSession.targetUserId],
    references: [user.id],
    relationName: 'impersonationTarget'
  })
}));

// ==================== GUEST DETAILS EXTENSION TABLES ====================

/**
 * Event Guest Settings Relations
 */
export const eventGuestSettingsRelations = relations(eventGuestSettings, ({ one }) => ({
  event: one(events, {
    fields: [eventGuestSettings.eventId],
    references: [events.id]
  })
}));

/**
 * Event RSVP Settings Relations
 */
export const eventRsvpSettingsRelations = relations(eventRsvpSettings, ({ one }) => ({
  event: one(events, {
    fields: [eventRsvpSettings.eventId],
    references: [events.id]
  })
}));

/**
 * Event Privacy Settings Relations
 */
export const eventPrivacySettingsRelations = relations(eventPrivacySettings, ({ one }) => ({
  event: one(events, {
    fields: [eventPrivacySettings.eventId],
    references: [events.id]
  })
}));

/**
 * Wedding Guest Details Relations
 */
export const weddingGuestDetailsRelations = relations(weddingGuestDetails, ({ one }) => ({
  guest: one(guests, {
    fields: [weddingGuestDetails.guestId],
    references: [guests.id]
  })
}));

/**
 * Corporate Guest Details Relations
 */
export const corporateGuestDetailsRelations = relations(corporateGuestDetails, ({ one }) => ({
  guest: one(guests, {
    fields: [corporateGuestDetails.guestId],
    references: [guests.id]
  })
}));

/**
 * Conference Guest Details Relations
 */
export const conferenceGuestDetailsRelations = relations(conferenceGuestDetails, ({ one }) => ({
  guest: one(guests, {
    fields: [conferenceGuestDetails.guestId],
    references: [guests.id]
  })
}));

/**
 * Birthday Guest Details Relations
 */
export const birthdayGuestDetailsRelations = relations(birthdayGuestDetails, ({ one }) => ({
  guest: one(guests, {
    fields: [birthdayGuestDetails.guestId],
    references: [guests.id]
  })
}));

// ==================== NOTIFICATION TABLES ====================

/**
 * Email Log Relations
 */
export const emailLogRelations = relations(emailLog, ({ one }) => ({
  user: one(user, {
    fields: [emailLog.userId],
    references: [user.id]
  }),
  event: one(events, {
    fields: [emailLog.eventId],
    references: [events.id]
  }),
}));

// ==================== FLOOR PLAN TABLES ====================

/**
 * Floor Plan Relations
 */
export const floorPlansRelations = relations(floorPlans, ({ one, many }) => ({
  event: one(events, {
    fields: [floorPlans.eventId],
    references: [events.id]
  }),
  objects: many(floorPlanObjects),
}));

/**
 * Floor Plan Object Relations
 */
export const floorPlanObjectsRelations = relations(floorPlanObjects, ({ one, many }) => ({
  floorPlan: one(floorPlans, {
    fields: [floorPlanObjects.floorPlanId],
    references: [floorPlans.id]
  }),
  seatAssignments: many(seatAssignments),
}));

/**
 * Seat Assignment Relations
 */
export const seatAssignmentsRelations = relations(seatAssignments, ({ one }) => ({
  floorPlanObject: one(floorPlanObjects, {
    fields: [seatAssignments.floorPlanObjectId],
    references: [floorPlanObjects.id]
  }),
  guest: one(guests, {
    fields: [seatAssignments.guestId],
    references: [guests.id]
  }),
}));

/**
 * Guest Relationship Relations
 */
export const guestRelationshipsRelations = relations(guestRelationships, ({ one }) => ({
  event: one(events, {
    fields: [guestRelationships.eventId],
    references: [events.id]
  }),
  guest1: one(guests, {
    fields: [guestRelationships.guestId1],
    references: [guests.id],
    relationName: 'guestRelationship1'
  }),
  guest2: one(guests, {
    fields: [guestRelationships.guestId2],
    references: [guests.id],
    relationName: 'guestRelationship2'
  }),
}));

/**
 * Object Template Relations
 */
export const objectTemplatesRelations = relations(objectTemplates, ({ one }) => ({
  event: one(events, {
    fields: [objectTemplates.eventId],
    references: [events.id]
  }),
}));
