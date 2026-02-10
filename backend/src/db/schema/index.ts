/**
 * Drizzle ORM Schema for Planloo
 *
 * This file exports all database schemas and relations.
 * Total: 26 tables across 7 schema files
 */

// Auth schemas (4 tables)
export * from './auth';

// Organization schemas (3 tables)
export * from './organization';

// Event schemas (5 tables: events, guests, eventCollaborators, tasks, eventGuestSettings)
export * from './events';

// Guest audit (1 table)
export * from './guestAudit';

// Guest Details extension schemas (4 tables)
export * from './guestDetails';

// Budget schemas (2 tables)
export * from './budget';

// Provider/Venue schemas (6 tables)
export * from './providers';

// Admin schemas (2 tables)
export * from './admin';

// Email log (1 table)
export * from './notifications';

// All relations
export * from './relations';
