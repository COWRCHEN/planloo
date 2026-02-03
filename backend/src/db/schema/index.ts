/**
 * Drizzle ORM Schema for Planloo
 *
 * This file exports all database schemas and relations.
 * Total: 21 tables across 6 schema files
 */

// Auth schemas (4 tables)
export * from './auth';

// Organization schemas (3 tables)
export * from './organization';

// Event schemas (4 tables)
export * from './events';

// Budget schemas (2 tables)
export * from './budget';

// Provider/Venue schemas (6 tables)
export * from './providers';

// Admin schemas (2 tables)
export * from './admin';

// All relations
export * from './relations';
