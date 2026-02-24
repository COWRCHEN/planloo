import { sqliteTable, text, integer, real, index, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';
import { events } from './events';

/**
 * Service Providers Table
 * Service providers/vendors available for events
 */
export const serviceProviders = sqliteTable('service_providers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }), // Optional: if provider has account
  businessName: text('business_name').notNull(),
  contactName: text('contact_name'),
  email: text('email').notNull(),
  phone: text('phone'),
  website: text('website'),
  category: text('category', {
    enum: ['catering', 'photography', 'videography', 'dj', 'entertainment', 'florist', 'decoration', 'transportation', 'av_technology', 'hair_makeup', 'other']
  }).notNull(),
  description: text('description'),
  servicesOffered: text('services_offered'), // JSON array of services
  priceRange: text('price_range', { enum: ['$$', '$$$', '$$$$'] }),
  locationAddress: text('location_address'),
  locationCity: text('location_city'),
  locationState: text('location_state'),
  locationCountry: text('location_country'),
  locationPostalCode: text('location_postal_code'),
  serviceAreaRadius: integer('service_area_radius'), // in miles/km
  ratingAverage: real('rating_average').default(0).notNull(),
  ratingCount: integer('rating_count').default(0).notNull(),
  logoUrl: text('logo_url'),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => ({
  uuidIdx: index('idx_service_providers_uuid').on(table.uuid),
  userIdIdx: index('idx_service_providers_user_id').on(table.userId),
  categoryIdx: index('idx_service_providers_category').on(table.category),
  locationIdx: index('idx_service_providers_location').on(table.locationCity, table.locationState),
  cityCountryIdx: index('idx_service_providers_city_country').on(table.locationCity, table.locationCountry),
  postalCodeIdx: index('idx_service_providers_postal_code').on(table.locationPostalCode),
  ratingIdx: index('idx_service_providers_rating').on(table.ratingAverage),
  isActiveIdx: index('idx_service_providers_is_active').on(table.isActive)
}));

/**
 * Venues Table
 * Venue/location listings for events
 */
export const venues = sqliteTable('venues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }), // Optional: venue owner account
  name: text('name').notNull(),
  description: text('description'),
  venueType: text('venue_type', {
    enum: ['banquet_hall', 'outdoor', 'hotel', 'restaurant', 'conference_center', 'other']
  }),
  capacityMin: integer('capacity_min'),
  capacityMax: integer('capacity_max'),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state'),
  country: text('country').notNull(),
  postalCode: text('postal_code'),
  lat: real('lat'),
  lng: real('lng'),
  pricePerHour: real('price_per_hour'),
  pricePerDay: real('price_per_day'),
  currency: text('currency').default('USD').notNull(),
  amenities: text('amenities'), // JSON array: ['parking', 'wifi', 'catering', 'av_equipment']
  policies: text('policies'), // JSON object with cancellation, deposit, etc.
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  website: text('website'),
  ratingAverage: real('rating_average').default(0).notNull(),
  ratingCount: integer('rating_count').default(0).notNull(),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => ({
  uuidIdx: index('idx_venues_uuid').on(table.uuid),
  cityIdx: index('idx_venues_city').on(table.city),
  cityCountryIdx: index('idx_venues_city_country').on(table.city, table.country),
  postalCodeIdx: index('idx_venues_postal_code').on(table.postalCode),
  typeIdx: index('idx_venues_type').on(table.venueType),
  capacityIdx: index('idx_venues_capacity').on(table.capacityMax),
  locationIdx: index('idx_venues_location').on(table.lat, table.lng),
  isActiveIdx: index('idx_venues_is_active').on(table.isActive)
}));

/**
 * Event Service Providers Table
 * Junction table linking events to service providers
 */
export const eventServiceProviders = sqliteTable('event_service_providers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  serviceProviderId: integer('service_provider_id').notNull().references(() => serviceProviders.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['inquiry', 'quoted', 'booked', 'confirmed', 'completed', 'cancelled']
  }).default('inquiry').notNull(),
  quoteAmount: real('quote_amount'),
  finalAmount: real('final_amount'),
  currency: text('currency').default('USD').notNull(),
  contractUrl: text('contract_url'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  eventIdx: index('idx_event_service_providers_event').on(table.eventId),
  providerIdx: index('idx_event_service_providers_provider').on(table.serviceProviderId),
  uniqueEventProvider: unique('unique_event_provider').on(table.eventId, table.serviceProviderId)
}));

/**
 * Event Venues Table
 * Junction table linking events to venues
 */
export const eventVenues = sqliteTable('event_venues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  venueId: integer('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['inquiry', 'quoted', 'booked', 'confirmed', 'completed', 'cancelled']
  }).default('inquiry').notNull(),
  bookingDate: integer('booking_date', { mode: 'timestamp' }),
  bookingStartTime: integer('booking_start_time', { mode: 'timestamp' }),
  bookingEndTime: integer('booking_end_time', { mode: 'timestamp' }),
  quoteAmount: real('quote_amount'),
  finalAmount: real('final_amount'),
  currency: text('currency').default('USD').notNull(),
  depositAmount: real('deposit_amount'),
  depositPaid: integer('deposit_paid', { mode: 'boolean' }).default(false).notNull(),
  contractUrl: text('contract_url'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  eventIdx: index('idx_event_venues_event').on(table.eventId),
  venueIdx: index('idx_event_venues_venue').on(table.venueId),
  bookingDateIdx: index('idx_event_venues_booking_date').on(table.bookingDate)
}));

/**
 * Images Table
 * Image storage for events, venues, and providers
 */
export const images = sqliteTable('images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  entityType: text('entity_type', {
    enum: ['event', 'venue', 'service_provider', 'user']
  }).notNull(),
  entityId: integer('entity_id').notNull(),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  altText: text('alt_text'),
  caption: text('caption'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isCover: integer('is_cover', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => ({
  entityIdx: index('idx_images_entity').on(table.entityType, table.entityId),
  uuidIdx: index('idx_images_uuid').on(table.uuid)
}));

/**
 * Reviews Table
 * Reviews for service providers and venues
 */
export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  entityType: text('entity_type', { enum: ['service_provider', 'venue'] }).notNull(),
  entityId: integer('entity_id').notNull(),
  eventId: integer('event_id').references(() => events.id, { onDelete: 'set null' }), // Optional: link to specific event
  rating: integer('rating').notNull(), // 1-5, enforced by CHECK constraint
  title: text('title'),
  reviewText: text('review_text'),
  wouldRecommend: integer('would_recommend', { mode: 'boolean' }).default(true).notNull(),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false).notNull(), // verified from actual booking
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => ({
  entityIdx: index('idx_reviews_entity').on(table.entityType, table.entityId),
  userIdIdx: index('idx_reviews_user_id').on(table.userId),
  ratingIdx: index('idx_reviews_rating').on(table.rating),
  createdAtIdx: index('idx_reviews_created_at').on(table.createdAt)
}));

/**
 * User Venue Ratings Table
 * Tracks user 1-5 star ratings for venues
 */
export const userVenueRatings = sqliteTable('user_venue_ratings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  venueId: integer('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  rating: integer('rating'), // 1-5, nullable (user may comment without rating)
  comment: text('comment'), // optional free-text comment
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  userIdx: index('idx_uvr_user').on(table.userId),
  venueIdx: index('idx_uvr_venue').on(table.venueId),
  uniqueUserVenue: unique('unique_user_venue_rating').on(table.userId, table.venueId),
}));
