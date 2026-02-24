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

// ==================== ADDRESS CONSTANTS ====================

export const SUPPORTED_COUNTRIES = ['US', 'CA'] as const;
export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC',
] as const;

export const CA_PROVINCES = [
  'AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT',
] as const;

export const STATE_LABELS: Record<string, string> = {
  // US States
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
  // Canadian Provinces
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
  SK: 'Saskatchewan', YT: 'Yukon',
};

export const US_POSTAL_CODE_REGEX = /^\d{5}(-\d{4})?$/;
export const CA_POSTAL_CODE_REGEX = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;

/** Cross-validates country, state/province, and postal code format */
function validateAddressFields(
  country: string | null | undefined,
  state: string | null | undefined,
  postalCode: string | null | undefined,
  stateField: string,
  postalField: string,
  ctx: z.RefinementCtx,
) {
  if (!country) return;

  if (country === 'US') {
    if (state && !(US_STATES as readonly string[]).includes(state)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid US state code',
        path: [stateField],
      });
    }
    if (postalCode && !US_POSTAL_CODE_REGEX.test(postalCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid US postal code (e.g. 90210 or 90210-1234)',
        path: [postalField],
      });
    }
  } else if (country === 'CA') {
    if (state && !(CA_PROVINCES as readonly string[]).includes(state)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid Canadian province code',
        path: [stateField],
      });
    }
    if (postalCode && !CA_POSTAL_CODE_REGEX.test(postalCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid Canadian postal code (e.g. A1A 1A1)',
        path: [postalField],
      });
    }
  }
}

/** Validate provider address fields (locationCountry, locationState, locationPostalCode) */
export function validateProviderAddress(
  data: { locationCountry?: string | null | undefined; locationState?: string | null | undefined; locationPostalCode?: string | null | undefined },
  ctx: z.RefinementCtx,
) {
  validateAddressFields(data.locationCountry, data.locationState, data.locationPostalCode, 'locationState', 'locationPostalCode', ctx);
}

/** Validate venue address fields (country, state, postalCode) */
export function validateVenueAddress(
  data: { country?: string | null | undefined; state?: string | null | undefined; postalCode?: string | null | undefined },
  ctx: z.RefinementCtx,
) {
  validateAddressFields(data.country, data.state, data.postalCode, 'state', 'postalCode', ctx);
}

/** @deprecated Use validateProviderAddress or validateVenueAddress instead */
export const validateAddress = validateProviderAddress;

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
  locationAddress: z.string().min(1, 'Address is required').max(500),
  locationCity: z.string().min(1, 'City is required').max(100),
  locationState: z.string().max(10),
  locationCountry: z.enum(SUPPORTED_COUNTRIES, { required_error: 'Country is required' }),
  locationPostalCode: z.string().min(1, 'Postal code is required').max(20),
}).superRefine((data, ctx) => validateProviderAddress(data, ctx));

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
  locationAddress: z.string().min(1).max(500).optional(),
  locationCity: z.string().min(1).max(100).optional(),
  locationState: z.string().max(10).optional(),
  locationCountry: z.enum(SUPPORTED_COUNTRIES).optional(),
  locationPostalCode: z.string().max(20).optional(),
}).superRefine((data, ctx) => {
  if (data.locationCountry || data.locationState || data.locationPostalCode) {
    validateProviderAddress(data, ctx);
  }
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
  state: z.string().min(1, 'State/Province is required').max(10),
  country: z.enum(SUPPORTED_COUNTRIES, { required_error: 'Country is required' }),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  capacityMin: z.coerce.number().int().min(0).optional().nullable(),
  capacityMax: z.coerce.number().int().min(0).optional().nullable(),
  pricePerHour: z.coerce.number().min(0).optional().nullable(),
  pricePerDay: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  amenities: z.array(z.string()).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
}).superRefine((data, ctx) => validateVenueAddress(data, ctx));

export const updateVenueSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  venueType: z.enum(VENUE_TYPES).optional().nullable(),
  address: z.string().min(1).max(500).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().max(10).optional(),
  country: z.enum(SUPPORTED_COUNTRIES).optional(),
  postalCode: z.string().max(20).optional(),
  capacityMin: z.coerce.number().int().min(0).optional().nullable(),
  capacityMax: z.coerce.number().int().min(0).optional().nullable(),
  pricePerHour: z.coerce.number().min(0).optional().nullable(),
  pricePerDay: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  amenities: z.array(z.string()).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.country || data.state || data.postalCode) {
    validateVenueAddress(data, ctx);
  }
});

export const listVenuesQuerySchema = z.object({
  search: z.string().max(200).optional(),
  venueType: z.enum(VENUE_TYPES).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.enum(SUPPORTED_COUNTRIES).optional(),
  capacityMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  amenities: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'ratingAverage', 'capacityMax', 'pricePerDay', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const rateVenueSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export const commentVenueSchema = z.object({
  comment: z.string().max(2000).nullable(),
});

export const listVenueReviewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export const checkAvailabilityQuerySchema = z.object({
  venueUuid: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const nearbyQuerySchema = z.object({
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.enum(SUPPORTED_COUNTRIES).optional(),
  category: z.enum(PROVIDER_CATEGORIES).optional(),
  venueType: z.enum(VENUE_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
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
export type RateVenueInput = z.infer<typeof rateVenueSchema>;
export type CommentVenueInput = z.infer<typeof commentVenueSchema>;
export type ListVenueReviewsQuery = z.infer<typeof listVenueReviewsQuerySchema>;
export type CheckAvailabilityQuery = z.infer<typeof checkAvailabilityQuerySchema>;
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
export type CreateEventProviderInput = z.infer<typeof createEventProviderSchema>;
export type UpdateEventProviderInput = z.infer<typeof updateEventProviderSchema>;
export type CreateEventVenueInput = z.infer<typeof createEventVenueSchema>;
export type UpdateEventVenueInput = z.infer<typeof updateEventVenueSchema>;

// ==================== RESPONSE TYPES ====================

export interface RatingBreakdown {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface VenueReviewItem {
  id: number;
  userName: string;
  rating: number | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VenueReviewsResponse {
  reviews: VenueReviewItem[];
  breakdown: RatingBreakdown;
  meta: { total: number; limit: number; offset: number };
}

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
  locationAddress: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
  locationPostalCode: string | null;
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
  ratingBreakdown: RatingBreakdown | null;
  userRating: number | null;
  userComment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityResponse {
  available: boolean;
  conflictCount: number;
  date: string;
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
