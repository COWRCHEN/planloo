import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { events, guests } from './events';

const TABLE_SHAPES = ['round', 'rectangular', 'square', 'oval', 'semicircle', 'head_table'] as const;
const ELEMENT_TYPES = [
  'dance_floor', 'bar', 'buffet', 'stage', 'dj_booth', 'photo_booth',
  'entrance', 'exit', 'restroom', 'dessert_station', 'gift_table', 'custom',
] as const;

/**
 * Object Templates Table
 * Reusable presets for tables/elements, scoped per event.
 * Shared across all floor plans within the same event.
 */
export const objectTemplates = sqliteTable('object_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  objectType: text('object_type', { enum: ['table', 'element'] }).notNull(),
  tableShape: text('table_shape', { enum: TABLE_SHAPES }),
  elementType: text('element_type', { enum: ELEMENT_TYPES }),
  label: text('label').notNull(),
  widthFt: real('width_ft').notNull(),
  heightFt: real('height_ft').notNull(),
  seatCount: integer('seat_count'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  eventIdIdx: index('idx_object_templates_event_id').on(table.eventId),
  uuidIdx: index('idx_object_templates_uuid').on(table.uuid),
}));

/**
 * Floor Plans Table
 * One event can have multiple floor plans (e.g., ceremony vs reception).
 */
export const floorPlans = sqliteTable('floor_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  widthFt: real('width_ft').notNull().default(100),
  heightFt: real('height_ft').notNull().default(80),
  gridSnap: integer('grid_snap').notNull().default(1),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
}, (table) => ({
  eventIdIdx: index('idx_floor_plans_event_id').on(table.eventId),
  uuidIdx: index('idx_floor_plans_uuid').on(table.uuid),
}));

/**
 * Floor Plan Objects Table
 * Tables AND venue elements in one table, discriminated by objectType.
 */
export const floorPlanObjects = sqliteTable('floor_plan_objects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  floorPlanId: integer('floor_plan_id').notNull().references(() => floorPlans.id, { onDelete: 'cascade' }),
  objectType: text('object_type', { enum: ['table', 'element'] }).notNull(),
  tableShape: text('table_shape', {
    enum: ['round', 'rectangular', 'square', 'oval', 'semicircle', 'head_table'],
  }),
  elementType: text('element_type', {
    enum: [
      'dance_floor', 'bar', 'buffet', 'stage', 'dj_booth', 'photo_booth',
      'entrance', 'exit', 'restroom', 'dessert_station', 'gift_table', 'custom',
    ],
  }),
  label: text('label').notNull(),
  posX: real('pos_x').notNull().default(10),
  posY: real('pos_y').notNull().default(10),
  widthFt: real('width_ft').notNull().default(6),
  heightFt: real('height_ft').notNull().default(6),
  rotation: integer('rotation').notNull().default(0),
  seatCount: integer('seat_count'),
  tableNumber: integer('table_number'),
  style: text('style'),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  floorPlanIdIdx: index('idx_floor_plan_objects_floor_plan_id').on(table.floorPlanId),
  uuidIdx: index('idx_floor_plan_objects_uuid').on(table.uuid),
}));

/**
 * Seat Assignments Table
 * Guest → specific seat at a table.
 */
export const seatAssignments = sqliteTable('seat_assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  floorPlanObjectId: integer('floor_plan_object_id').notNull().references(() => floorPlanObjects.id, { onDelete: 'cascade' }),
  guestId: integer('guest_id').notNull().references(() => guests.id, { onDelete: 'cascade' }),
  seatNumber: integer('seat_number').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  objectIdIdx: index('idx_seat_assignments_object_id').on(table.floorPlanObjectId),
  guestIdIdx: index('idx_seat_assignments_guest_id').on(table.guestId),
  uniqueGuestObject: uniqueIndex('uq_seat_assignment_guest_object').on(table.guestId, table.floorPlanObjectId),
}));

/**
 * Guest Relationships Table
 * Social mapping / proximity logic (prefer_together / avoid).
 */
export const guestRelationships = sqliteTable('guest_relationships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  guestId1: integer('guest_id_1').notNull().references(() => guests.id, { onDelete: 'cascade' }),
  guestId2: integer('guest_id_2').notNull().references(() => guests.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type', { enum: ['prefer_together', 'avoid'] }).notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  eventIdIdx: index('idx_guest_relationships_event_id').on(table.eventId),
  uniquePair: uniqueIndex('uq_guest_relationship_pair').on(table.eventId, table.guestId1, table.guestId2),
}));
