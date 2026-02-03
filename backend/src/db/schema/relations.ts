import { relations } from 'drizzle-orm';
import { user, session, account } from './auth';
import { organization, organizationMember, organizationInvitation } from './organization';
import { events, guests, eventCollaborators, tasks } from './events';
import { budgetItems, payments } from './budget';
import { serviceProviders, venues, eventServiceProviders, eventVenues, images, reviews } from './providers';
import { auditLog, impersonationSession } from './admin';

/**
 * User Relations
 */
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  organizationMemberships: many(organizationMember),
  organizationsCreated: many(organization),
  personalEvents: many(events),
  eventCollaborations: many(eventCollaborators),
  tasksAssigned: many(tasks),
  serviceProviders: many(serviceProviders),
  venues: many(venues),
  reviews: many(reviews),
  auditLogs: many(auditLog),
  impersonationSessionsAsAdmin: many(impersonationSession, { relationName: 'impersonationAdmin' }),
  impersonationSessionsAsTarget: many(impersonationSession, { relationName: 'impersonationTarget' })
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
    references: [user.id]
  }),
  inviter: one(user, {
    fields: [organizationMember.invitedBy],
    references: [user.id]
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
  reviews: many(reviews)
}));

/**
 * Guests Relations
 */
export const guestsRelations = relations(guests, ({ one }) => ({
  event: one(events, {
    fields: [guests.eventId],
    references: [events.id]
  })
}));

/**
 * Event Collaborators Relations
 */
export const eventCollaboratorsRelations = relations(eventCollaborators, ({ one }) => ({
  event: one(events, {
    fields: [eventCollaborators.eventId],
    references: [events.id]
  }),
  user: one(user, {
    fields: [eventCollaborators.userId],
    references: [user.id]
  }),
  inviter: one(user, {
    fields: [eventCollaborators.invitedByUserId],
    references: [user.id]
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
 */
export const serviceProvidersRelations = relations(serviceProviders, ({ one, many }) => ({
  user: one(user, {
    fields: [serviceProviders.userId],
    references: [user.id]
  }),
  eventBookings: many(eventServiceProviders),
  budgetItems: many(budgetItems),
  reviews: many(reviews)
}));

/**
 * Venues Relations
 */
export const venuesRelations = relations(venues, ({ one, many }) => ({
  user: one(user, {
    fields: [venues.userId],
    references: [user.id]
  }),
  eventBookings: many(eventVenues),
  reviews: many(reviews)
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
