import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Type Exports for Planloo Database
 *
 * This file provides TypeScript types inferred from the Drizzle schema.
 * Use these types throughout the application for type safety.
 */

// ==================== AUTH TYPES ====================

export type User = InferSelectModel<typeof schema.user>;
export type NewUser = InferInsertModel<typeof schema.user>;

export type Session = InferSelectModel<typeof schema.session>;
export type NewSession = InferInsertModel<typeof schema.session>;

export type Account = InferSelectModel<typeof schema.account>;
export type NewAccount = InferInsertModel<typeof schema.account>;

export type Verification = InferSelectModel<typeof schema.verification>;
export type NewVerification = InferInsertModel<typeof schema.verification>;

// ==================== ORGANIZATION TYPES ====================

export type Organization = InferSelectModel<typeof schema.organization>;
export type NewOrganization = InferInsertModel<typeof schema.organization>;

export type OrganizationMember = InferSelectModel<typeof schema.organizationMember>;
export type NewOrganizationMember = InferInsertModel<typeof schema.organizationMember>;

export type OrganizationInvitation = InferSelectModel<typeof schema.organizationInvitation>;
export type NewOrganizationInvitation = InferInsertModel<typeof schema.organizationInvitation>;

// ==================== EVENT TYPES ====================

export type Event = InferSelectModel<typeof schema.events>;
export type NewEvent = InferInsertModel<typeof schema.events>;

export type Guest = InferSelectModel<typeof schema.guests>;
export type NewGuest = InferInsertModel<typeof schema.guests>;

export type EventCollaborator = InferSelectModel<typeof schema.eventCollaborators>;
export type NewEventCollaborator = InferInsertModel<typeof schema.eventCollaborators>;

export type Task = InferSelectModel<typeof schema.tasks>;
export type NewTask = InferInsertModel<typeof schema.tasks>;

export type EventGuestSettings = InferSelectModel<typeof schema.eventGuestSettings>;
export type NewEventGuestSettings = InferInsertModel<typeof schema.eventGuestSettings>;

// ==================== GUEST DETAILS TYPES ====================

export type WeddingGuestDetails = InferSelectModel<typeof schema.weddingGuestDetails>;
export type NewWeddingGuestDetails = InferInsertModel<typeof schema.weddingGuestDetails>;

export type CorporateGuestDetails = InferSelectModel<typeof schema.corporateGuestDetails>;
export type NewCorporateGuestDetails = InferInsertModel<typeof schema.corporateGuestDetails>;

export type ConferenceGuestDetails = InferSelectModel<typeof schema.conferenceGuestDetails>;
export type NewConferenceGuestDetails = InferInsertModel<typeof schema.conferenceGuestDetails>;

export type BirthdayGuestDetails = InferSelectModel<typeof schema.birthdayGuestDetails>;
export type NewBirthdayGuestDetails = InferInsertModel<typeof schema.birthdayGuestDetails>;

// ==================== BUDGET TYPES ====================

export type BudgetItem = InferSelectModel<typeof schema.budgetItems>;
export type NewBudgetItem = InferInsertModel<typeof schema.budgetItems>;

export type Payment = InferSelectModel<typeof schema.payments>;
export type NewPayment = InferInsertModel<typeof schema.payments>;

// ==================== PROVIDER/VENUE TYPES ====================

export type ServiceProvider = InferSelectModel<typeof schema.serviceProviders>;
export type NewServiceProvider = InferInsertModel<typeof schema.serviceProviders>;

export type Venue = InferSelectModel<typeof schema.venues>;
export type NewVenue = InferInsertModel<typeof schema.venues>;

export type EventServiceProvider = InferSelectModel<typeof schema.eventServiceProviders>;
export type NewEventServiceProvider = InferInsertModel<typeof schema.eventServiceProviders>;

export type EventVenue = InferSelectModel<typeof schema.eventVenues>;
export type NewEventVenue = InferInsertModel<typeof schema.eventVenues>;

export type Image = InferSelectModel<typeof schema.images>;
export type NewImage = InferInsertModel<typeof schema.images>;

export type Review = InferSelectModel<typeof schema.reviews>;
export type NewReview = InferInsertModel<typeof schema.reviews>;

// ==================== ADMIN TYPES ====================

export type AuditLog = InferSelectModel<typeof schema.auditLog>;
export type NewAuditLog = InferInsertModel<typeof schema.auditLog>;

export type ImpersonationSession = InferSelectModel<typeof schema.impersonationSession>;
export type NewImpersonationSession = InferInsertModel<typeof schema.impersonationSession>;

// ==================== ENUM TYPES ====================

export type PlatformRole = 'super_admin' | 'operator' | 'user';
export type OrganizationType = 'company' | 'family';
export type OrganizationRole = 'admin' | 'member' | 'viewer';
export type EventType = 'wedding' | 'birthday' | 'corporate' | 'conference' | 'other';
export type EventStatus = 'draft' | 'planning' | 'confirmed' | 'completed' | 'cancelled';
export type GuestCategory = 'vip' | 'family' | 'friend' | 'colleague' | 'other';
export type RsvpStatus = 'pending' | 'confirmed' | 'declined' | 'maybe';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type BudgetCategory = 'venue' | 'catering' | 'entertainment' | 'decorations' | 'photography' | 'other';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type PaymentMethod = 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'other';
export type ServiceProviderCategory = 'catering' | 'photography' | 'dj' | 'florist' | 'venue' | 'decoration' | 'other';
export type PriceRange = '$$' | '$$$' | '$$$$';
export type VenueType = 'banquet_hall' | 'outdoor' | 'hotel' | 'restaurant' | 'conference_center' | 'other';
export type BookingStatus = 'inquiry' | 'quoted' | 'booked' | 'confirmed' | 'completed' | 'cancelled';
export type EntityType = 'event' | 'venue' | 'service_provider' | 'user';
export type ReviewEntityType = 'service_provider' | 'venue';
export type EventCollaboratorRole = 'owner' | 'editor' | 'viewer';
export type AuditLogActorRole = 'super_admin' | 'operator';

// Guest Details Enums (re-export from schema for convenience)
export type WeddingGuestSide = 'bride' | 'groom' | 'both';
export type WeddingInvitedTo = 'ceremony' | 'reception' | 'both';
export type AgeGroup = 'child' | 'teen' | 'adult';
export type AttendeeType = 'employee' | 'client' | 'vendor' | 'partner' | 'other';
export type BadgeType = 'speaker' | 'vip' | 'standard' | 'press' | 'exhibitor' | 'staff';

// Custom Field Types (for Phase 3)
export type CustomFieldType = 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'checkbox';

// Custom field definition structure
export interface CustomFieldDefinition {
  id: string;
  type: CustomFieldType;
  label: string;
  required: boolean;
  helpText?: string;
  options?: string[]; // For select/multiselect types
}

// Meal choice option structure
export interface MealChoiceOption {
  key: string;
  label: string;
}
