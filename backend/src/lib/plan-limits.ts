/**
 * Plan Limits and Feature Flags
 *
 * Compile-time constants for each subscription tier.
 * No database table — these are hardcoded and deployed with the app.
 * Enterprise limits are resolved at runtime from the DB row.
 */

export type PlanId = 'free' | 'personal' | 'planner' | 'agency' | 'enterprise';

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
  guestAuditHistory: boolean; // agency+ only
  sso: boolean; // enterprise-only (not enforced yet)
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
    guestAuditHistory: false,
    sso: false,
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
    guestAuditHistory: false,
    sso: false,
  },

  planner: {
    maxActiveEvents: 25,
    maxGuests: 600,
    emailPoolPerMonth: 3000,
    smsPoolPerMonth: 600,
    maxCollaboratorsPerEvent: 10,
    maxCustomFieldsPerEvent: 10,
    maxOrganizations: 1,
    maxOrgMembers: 5,
    csvImportExport: true,
    floorPlans: true,
    budgetTracking: true,
    taskTemplates: true,
    vendorManagement: true,
    guestAuditHistory: false,
    sso: false,
  },

  agency: {
    maxActiveEvents: 100,
    maxGuests: 2000,
    emailPoolPerMonth: 20000,
    smsPoolPerMonth: 1500,
    maxCollaboratorsPerEvent: null,
    maxCustomFieldsPerEvent: 10,
    maxOrganizations: 3,
    maxOrgMembers: 10,
    csvImportExport: true,
    floorPlans: true,
    budgetTracking: true,
    taskTemplates: true,
    vendorManagement: true,
    guestAuditHistory: true,
    sso: false,
  },

  enterprise: {
    maxActiveEvents: null,
    maxGuests: null,
    emailPoolPerMonth: null,
    smsPoolPerMonth: null,
    maxCollaboratorsPerEvent: null,
    maxCustomFieldsPerEvent: 999,
    maxOrganizations: 999,
    maxOrgMembers: null,
    csvImportExport: true,
    floorPlans: true,
    budgetTracking: true,
    taskTemplates: true,
    vendorManagement: true,
    guestAuditHistory: true,
    sso: true,
  },
};

/**
 * Email and SMS pool multipliers applied per-guest when pools are not explicitly set.
 *
 * Based on agency tier ratios (30,000 emails / 3,000 guests = 10×; 1,500 SMS / 3,000 = 0.5×).
 * Keeps COGS well below deal price at any guest cap.
 *
 * Email: 10 emails/guest/mo → ~$0.004 COGS/guest (Resend $0.0004/email)
 * SMS:  1 SMS/guest/mo   → ~$0.008 COGS/guest (Twilio $0.008/SMS)
 */
export const ENTERPRISE_EMAIL_PER_GUEST = 10;
export const ENTERPRISE_SMS_PER_GUEST = 1;

/**
 * Resolve effective limits for an enterprise subscription.
 *
 * Merge order:
 *   1. Start with enterprise defaults (all nulls/true).
 *   2. Apply explicit custom_limits overrides from the DB row.
 *   3. If emailPoolPerMonth or smsPoolPerMonth are still null after step 2,
 *      and the guest cap is finite, derive pools from maxGuests × multiplier.
 *      This prevents accidental unlimited email/SMS, which has direct COGS impact.
 *
 * If maxGuests is also null (truly unlimited deal), pools remain null — sales must
 * explicitly negotiate and set emailPoolPerMonth / smsPoolPerMonth for that deal.
 */
export function resolveEnterpriseLimits(customLimits: Partial<PlanLimits> | null): PlanLimits {
  const limits: PlanLimits = { ...PLAN_LIMITS.enterprise, ...customLimits };

  if (limits.maxGuests !== null) {
    if (limits.emailPoolPerMonth === null) {
      limits.emailPoolPerMonth = Math.ceil(limits.maxGuests * ENTERPRISE_EMAIL_PER_GUEST);
    }
    if (limits.smsPoolPerMonth === null) {
      limits.smsPoolPerMonth = Math.ceil(limits.maxGuests * ENTERPRISE_SMS_PER_GUEST);
    }
  }

  return limits;
}

/**
 * Monthly pricing in USD cents
 */
export const PLAN_PRICES_MONTHLY: Record<Exclude<PlanId, 'free' | 'enterprise'>, number> = {
  personal: 1999,
  planner: 3999,
  agency: 19999,
};

/**
 * Annual pricing per month in USD cents (billed annually)
 */
export const PLAN_PRICES_ANNUAL: Record<Exclude<PlanId, 'free' | 'enterprise'>, number> = {
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
      return 'enterprise';
    case 'enterprise':
      return null;
  }
}
