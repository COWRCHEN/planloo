/**
 * Event Schemas
 *
 * Shared Zod schemas and TypeScript types for events.
 * Used by both frontend and backend for validation and type safety.
 */

import { z } from 'zod';

// ==================== ENUMS ====================

export const EVENT_TYPES = [
  'wedding',
  'birthday',
  'corporate',
  'conference',
  'other',
  'holiday_party',
  'engagement_party',
  'fundraiser',
  'anniversary',
  'graduation',
  'retirement',
  'baby_shower',
  'bridal_shower',
  'themed',
  'celebration_of_life',
] as const;
export const EVENT_STATUSES = ['draft', 'planning', 'confirmed', 'completed', 'cancelled'] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];

// ==================== SCHEMAS ====================

/**
 * Schema for creating a new event
 */
export const createEventSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional()
    .nullable(),
  eventType: z.enum(EVENT_TYPES).optional().nullable(),
  startDate: z.coerce.date({ required_error: 'Start date is required' }),
  endDate: z.coerce.date().optional().nullable(),
  timezone: z.string().default('UTC'),
  locationName: z.string().max(200).optional().nullable(),
  locationAddress: z.string().max(500).optional().nullable(),
  locationCity: z.string().max(100).optional().nullable(),
  locationState: z.string().max(100).optional().nullable(),
  locationCountry: z.string().max(100).optional().nullable(),
  locationPostalCode: z.string().max(20).optional().nullable(),
  guestCountExpected: z.coerce.number().int().min(0).optional().nullable(),
  budgetTotal: z.coerce.number().min(0).optional().nullable(),
  budgetCurrency: z.string().length(3).default('USD'),
  isPublic: z.boolean().default(false),
});

/**
 * Schema for updating an existing event
 */
export const updateEventSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  description: z
    .string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional()
    .nullable(),
  eventType: z.enum(EVENT_TYPES).optional().nullable(),
  status: z.enum(EVENT_STATUSES).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional().nullable(),
  timezone: z.string().optional(),
  locationName: z.string().max(200).optional().nullable(),
  locationAddress: z.string().max(500).optional().nullable(),
  locationCity: z.string().max(100).optional().nullable(),
  locationState: z.string().max(100).optional().nullable(),
  locationCountry: z.string().max(100).optional().nullable(),
  locationPostalCode: z.string().max(20).optional().nullable(),
  guestCountExpected: z.coerce.number().int().min(0).optional().nullable(),
  budgetTotal: z.coerce.number().min(0).optional().nullable(),
  budgetCurrency: z.string().length(3).optional(),
  isPublic: z.boolean().optional(),
  coverImageUrl: z.string().url().optional().nullable(),
});

/**
 * Schema for listing events query parameters
 */
export const listEventsQuerySchema = z.object({
  status: z.enum(EVENT_STATUSES).optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['startDate', 'createdAt', 'title']).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ==================== TYPES ====================

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

/**
 * Access permissions returned by the event detail endpoint.
 * Populated by resolveEventAccess based on the user's relationship to the event.
 */
export interface EventAccessInfo {
  type: 'owner' | 'org_admin' | 'org_member' | 'org_viewer' | 'collaborator_owner' | 'collaborator_editor' | 'collaborator_viewer';
  canEdit: boolean;
  canDelete: boolean;
  canManageGuests: boolean;
  canManageCollaborators: boolean;
  canManageBudget: boolean;
}

/**
 * Event response type (from API)
 */
export interface EventResponse {
  id: number;
  uuid: string;
  userId: string;
  organizationId: string | null;
  organizationName?: string | null;
  title: string;
  description: string | null;
  eventType: EventType | null;
  status: EventStatus;
  startDate: string;
  endDate: string | null;
  timezone: string | null;
  locationName: string | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
  locationPostalCode: string | null;
  locationLat: number | null;
  locationLng: number | null;
  guestCountExpected: number | null;
  guestCountConfirmed: number | null;
  budgetTotal: number | null;
  budgetCurrency: string | null;
  isPublic: boolean;
  slug: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  _access?: EventAccessInfo;
}

/**
 * Dashboard statistics response
 */
export interface EventStatsResponse {
  totalEvents: number;
  upcomingEvents: number;
  draftEvents: number;
  completedEvents: number;
  totalGuests: number;
  confirmedGuests: number;
}
