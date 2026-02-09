/**
 * Provider & Venue Schemas
 *
 * Shared Zod schemas and TypeScript types for service providers and venues.
 * Used by both frontend and backend for validation and type safety.
 */

import { z } from 'zod';

// ==================== ENUMS ====================

export const PROVIDER_CATEGORIES = ['catering', 'photography', 'dj', 'florist', 'venue', 'decoration', 'other'] as const;
export const PRICE_RANGES = ['$$', '$$$', '$$$$'] as const;
export const VENUE_TYPES = ['banquet_hall', 'outdoor', 'hotel', 'restaurant', 'conference_center', 'other'] as const;
export const BOOKING_STATUSES = ['inquiry', 'quoted', 'booked', 'confirmed', 'completed', 'cancelled'] as const;

export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];
export type PriceRange = (typeof PRICE_RANGES)[number];
export type VenueType = (typeof VENUE_TYPES)[number];
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// ==================== PROVIDER SCHEMAS ====================

export const createProviderSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(200),
  contactName: z.string().max(200).optional().nullable(),
  email: z.string().email('Valid email is required'),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  category: z.enum(PROVIDER_CATEGORIES),
  description: z.string().max(2000).optional().nullable(),
  servicesOffered: z.array(z.string()).optional().nullable(),
  priceRange: z.enum(PRICE_RANGES).optional().nullable(),
  locationCity: z.string().max(100).optional().nullable(),
  locationState: z.string().max(100).optional().nullable(),
  locationCountry: z.string().max(100).optional().nullable(),
});

export const updateProviderSchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
  contactName: z.string().max(200).optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  category: z.enum(PROVIDER_CATEGORIES).optional(),
  description: z.string().max(2000).optional().nullable(),
  servicesOffered: z.array(z.string()).optional().nullable(),
  priceRange: z.enum(PRICE_RANGES).optional().nullable(),
  locationCity: z.string().max(100).optional().nullable(),
  locationState: z.string().max(100).optional().nullable(),
  locationCountry: z.string().max(100).optional().nullable(),
});

export const listProvidersQuerySchema = z.object({
  search: z.string().max(200).optional(),
  category: z.enum(PROVIDER_CATEGORIES).optional(),
  priceRange: z.enum(PRICE_RANGES).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['businessName', 'ratingAverage', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ==================== VENUE SCHEMAS ====================

export const createVenueSchema = z.object({
  name: z.string().min(1, 'Venue name is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  venueType: z.enum(VENUE_TYPES).optional().nullable(),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().max(100).optional().nullable(),
  country: z.string().min(1, 'Country is required').max(100),
  postalCode: z.string().max(20).optional().nullable(),
  capacityMin: z.coerce.number().int().min(0).optional().nullable(),
  capacityMax: z.coerce.number().int().min(0).optional().nullable(),
  pricePerHour: z.coerce.number().min(0).optional().nullable(),
  pricePerDay: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  amenities: z.array(z.string()).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
});

export const updateVenueSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  venueType: z.enum(VENUE_TYPES).optional().nullable(),
  address: z.string().min(1).max(500).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().min(1).max(100).optional(),
  postalCode: z.string().max(20).optional().nullable(),
  capacityMin: z.coerce.number().int().min(0).optional().nullable(),
  capacityMax: z.coerce.number().int().min(0).optional().nullable(),
  pricePerHour: z.coerce.number().min(0).optional().nullable(),
  pricePerDay: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  amenities: z.array(z.string()).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
});

export const listVenuesQuerySchema = z.object({
  search: z.string().max(200).optional(),
  venueType: z.enum(VENUE_TYPES).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  capacityMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'ratingAverage', 'capacityMax', 'pricePerDay', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ==================== EVENT LINK SCHEMAS ====================

export const createEventProviderSchema = z.object({
  providerUuid: z.string().uuid(),
  status: z.enum(BOOKING_STATUSES).default('inquiry'),
  quoteAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateEventProviderSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  quoteAmount: z.coerce.number().min(0).optional().nullable(),
  finalAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  contractUrl: z.string().url().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const createEventVenueSchema = z.object({
  venueUuid: z.string().uuid(),
  status: z.enum(BOOKING_STATUSES).default('inquiry'),
  bookingDate: z.coerce.date().optional().nullable(),
  quoteAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateEventVenueSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  bookingDate: z.coerce.date().optional().nullable(),
  quoteAmount: z.coerce.number().min(0).optional().nullable(),
  finalAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  depositAmount: z.coerce.number().min(0).optional().nullable(),
  depositPaid: z.boolean().optional(),
  contractUrl: z.string().url().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

// ==================== TYPES ====================

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
export type ListProvidersQuery = z.infer<typeof listProvidersQuerySchema>;
export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
export type ListVenuesQuery = z.infer<typeof listVenuesQuerySchema>;
export type CreateEventProviderInput = z.infer<typeof createEventProviderSchema>;
export type UpdateEventProviderInput = z.infer<typeof updateEventProviderSchema>;
export type CreateEventVenueInput = z.infer<typeof createEventVenueSchema>;
export type UpdateEventVenueInput = z.infer<typeof updateEventVenueSchema>;

// ==================== RESPONSE TYPES ====================

export interface ServiceProviderResponse {
  uuid: string;
  businessName: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  category: ProviderCategory;
  description: string | null;
  servicesOffered: string[] | null;
  priceRange: PriceRange | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VenueResponse {
  uuid: string;
  name: string;
  description: string | null;
  venueType: VenueType | null;
  address: string;
  city: string;
  state: string | null;
  country: string;
  postalCode: string | null;
  capacityMin: number | null;
  capacityMax: number | null;
  pricePerHour: number | null;
  pricePerDay: number | null;
  currency: string;
  amenities: string[] | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventServiceProviderResponse {
  id: number;
  status: BookingStatus;
  quoteAmount: number | null;
  finalAmount: number | null;
  currency: string;
  contractUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  provider: ServiceProviderResponse;
}

export interface EventVenueResponse {
  id: number;
  status: BookingStatus;
  bookingDate: string | null;
  quoteAmount: number | null;
  finalAmount: number | null;
  currency: string;
  depositAmount: number | null;
  depositPaid: boolean;
  contractUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  venue: VenueResponse;
}
