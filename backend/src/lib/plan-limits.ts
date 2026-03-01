/**
 * Plan Limits and Feature Flags
 *
 * Compile-time constants for each subscription tier.
 * No database table — these are hardcoded and deployed with the app.
 */

export type PlanId = 'free' | 'personal' | 'planner' | 'agency';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'free';

export interface PlanLimits {
  maxActiveEvents: number | null; // null = unlimited
  maxGuests: number | null; // total across all events
  emailPoolPerMonth: number | null; // null = no email sending
  smsPoolPerMonth: number | null; // null = no SMS
  maxCollaboratorsPerEvent: number | null;
  maxCustomFieldsPerEvent: number;
  maxOrganizations: number;
  maxOrgMembers: number | null; // null = unlimited

  // Feature flags
  csvImportExport: boolean;
  floorPlans: boolean;
  budgetTracking: boolean;
  taskTemplates: boolean;
  vendorManagement: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxActiveEvents: 1,
    maxGuests: 50,
    emailPoolPerMonth: null,
    smsPoolPerMonth: 0,
    maxCollaboratorsPerEvent: 0,
    maxCustomFieldsPerEvent: 0,
    maxOrganizations: 0,
    maxOrgMembers: null,
    csvImportExport: false,
    floorPlans: false,
    budgetTracking: false,
    taskTemplates: false,
    vendorManagement: false,
  },

  personal: {
    maxActiveEvents: 3,
    maxGuests: 200,
    emailPoolPerMonth: 1000,
    smsPoolPerMonth: 200,
    maxCollaboratorsPerEvent: 2,
    maxCustomFieldsPerEvent: 3,
    maxOrganizations: 0,
    maxOrgMembers: null,
    csvImportExport: true,
    floorPlans: false,
    budgetTracking: true,
    taskTemplates: true,
    vendorManagement: true,
  },

  planner: {
    maxActiveEvents: 25,
    maxGuests: 800,
    emailPoolPerMonth: 4000,
    smsPoolPerMonth: 750,
    maxCollaboratorsPerEvent: 10,
    maxCustomFieldsPerEvent: 10,
    maxOrganizations: 1,
    maxOrgMembers: 5,
    csvImportExport: true,
    floorPlans: true,
    budgetTracking: true,
    taskTemplates: true,
    vendorManagement: true,
  },

  agency: {
    maxActiveEvents: null,
    maxGuests: 3000,
    emailPoolPerMonth: 30000,
    smsPoolPerMonth: 1500,
    maxCollaboratorsPerEvent: null,
    maxCustomFieldsPerEvent: 10,
    maxOrganizations: 3,
    maxOrgMembers: null,
    csvImportExport: true,
    floorPlans: true,
    budgetTracking: true,
    taskTemplates: true,
    vendorManagement: true,
  },
};

/**
 * Monthly pricing in USD cents
 */
export const PLAN_PRICES_MONTHLY: Record<Exclude<PlanId, 'free'>, number> = {
  personal: 1999,
  planner: 3999,
  agency: 19999,
};

/**
 * Annual pricing per month in USD cents (billed annually)
 */
export const PLAN_PRICES_ANNUAL: Record<Exclude<PlanId, 'free'>, number> = {
  personal: 1599,
  planner: 3199,
  agency: 15999,
};

/**
 * Overage rates
 */
export const EMAIL_OVERAGE_PER_1000 = 2.0; // $2.00 per 1,000 extra emails
export const SMS_OVERAGE_RATE = 0.05; // $0.05 per extra SMS
export const GUEST_OVERAGE_RATE = 0.05; // $0.05 per extra guest

/**
 * Get plan limits for a given plan ID
 */
export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLAN_LIMITS[plan];
}

/**
 * Returns true if the subscription should be treated as active (access granted).
 * Free plan always passes — it has its own limits but no payment required.
 */
export function isSubscriptionActive(status: SubscriptionStatus, plan: PlanId): boolean {
  if (plan === 'free') return true;
  return status === 'active' || status === 'trialing';
}

/**
 * Returns the next suggested upgrade tier for a given plan
 */
export function getUpgradeTier(plan: PlanId): Exclude<PlanId, 'free'> | null {
  switch (plan) {
    case 'free':
      return 'personal';
    case 'personal':
      return 'planner';
    case 'planner':
      return 'agency';
    case 'agency':
      return null;
  }
}
