/**
 * Billing Checks
 *
 * Service functions called inside route handlers to enforce plan limits.
 * Each function returns null on success or an error response payload on failure.
 */

import { eq, and, isNull, count, sql } from 'drizzle-orm';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import type { PlanId, SubscriptionStatus } from '@/lib/plan-limits';
import { getPlanLimits, getUpgradeTier, isSubscriptionActive } from '@/lib/plan-limits';

// ==================== ERROR RESPONSE TYPE ====================

export interface BillingError {
  code: string;
  message: string;
  limit?: number;
  current?: number;
  upgradeTo?: string;
  upgradeUrl: string;
}

export interface BillingLimitResult {
  ok: boolean;
  error?: BillingError;
}

const UPGRADE_URL = '/dashboard/billing';

// ==================== HELPERS ====================

function limitError(
  code: string,
  message: string,
  extra: {
    limit?: number;
    current?: number;
    upgradeTo?: string | null;
  } = {}
): BillingLimitResult {
  const error: BillingError = { code, message, upgradeUrl: UPGRADE_URL };
  if (extra.limit !== undefined) error.limit = extra.limit;
  if (extra.current !== undefined) error.current = extra.current;
  if (extra.upgradeTo) error.upgradeTo = extra.upgradeTo;
  return { ok: false, error };
}

// ==================== LIMIT CHECKS ====================

/**
 * Check whether the user can create another active event.
 * Counts non-deleted personal events owned by the user.
 */
export async function checkEventCreationLimit(
  db: ReturnType<typeof createDbClient>,
  userId: string,
  plan: PlanId
): Promise<BillingLimitResult> {
  const limits = getPlanLimits(plan);
  if (limits.maxActiveEvents === null) return { ok: true };

  const rows = await db
    .select({ total: count() })
    .from(schema.events)
    .where(and(eq(schema.events.userId, userId), isNull(schema.events.deletedAt)));
  const total = rows[0]?.total ?? 0;

  if (total >= limits.maxActiveEvents) {
    return limitError(
      'EVENT_LIMIT_EXCEEDED',
      `Your ${plan} plan allows up to ${limits.maxActiveEvents} active event${limits.maxActiveEvents === 1 ? '' : 's'}.`,
      {
        limit: limits.maxActiveEvents,
        current: total,
        upgradeTo: getUpgradeTier(plan),
      }
    );
  }

  return { ok: true };
}

/**
 * Check whether the user can add another guest (across all their events).
 */
export async function checkGuestLimit(
  db: ReturnType<typeof createDbClient>,
  userId: string,
  plan: PlanId
): Promise<BillingLimitResult> {
  const limits = getPlanLimits(plan);
  if (limits.maxGuests === null) return { ok: true };

  // Count guests across all non-deleted events owned by this user
  const guestRows = await db
    .select({ total: count() })
    .from(schema.guests)
    .innerJoin(schema.events, eq(schema.guests.eventId, schema.events.id))
    .where(
      and(
        eq(schema.events.userId, userId),
        isNull(schema.guests.deletedAt),
        isNull(schema.events.deletedAt)
      )
    );
  const total = guestRows[0]?.total ?? 0;

  if (total >= limits.maxGuests) {
    return limitError(
      'GUEST_LIMIT_EXCEEDED',
      `Your ${plan} plan allows up to ${limits.maxGuests} guests across all events.`,
      {
        limit: limits.maxGuests,
        current: total,
        upgradeTo: getUpgradeTier(plan),
      }
    );
  }

  return { ok: true };
}

/**
 * Check whether an event can accept another collaborator.
 * Uses the plan of the event owner.
 */
export async function checkCollaboratorLimit(
  db: ReturnType<typeof createDbClient>,
  eventId: number,
  plan: PlanId
): Promise<BillingLimitResult> {
  const limits = getPlanLimits(plan);
  if (limits.maxCollaboratorsPerEvent === null) return { ok: true };

  if (limits.maxCollaboratorsPerEvent === 0) {
    return limitError(
      'COLLABORATORS_NOT_ALLOWED',
      `Your ${plan} plan does not support event collaborators.`,
      { limit: 0, current: 0, upgradeTo: getUpgradeTier(plan) }
    );
  }

  const collabRows = await db
    .select({ total: count() })
    .from(schema.eventCollaborators)
    .where(eq(schema.eventCollaborators.eventId, eventId));
  const total = collabRows[0]?.total ?? 0;

  if (total >= limits.maxCollaboratorsPerEvent) {
    return limitError(
      'COLLABORATOR_LIMIT_EXCEEDED',
      `Your ${plan} plan allows up to ${limits.maxCollaboratorsPerEvent} collaborator${limits.maxCollaboratorsPerEvent === 1 ? '' : 's'} per event.`,
      {
        limit: limits.maxCollaboratorsPerEvent,
        current: total,
        upgradeTo: getUpgradeTier(plan),
      }
    );
  }

  return { ok: true };
}

/**
 * Check whether the user's email quota allows sending more emails this period.
 */
export function checkEmailQuota(
  emailsSentThisPeriod: number,
  plan: PlanId
): BillingLimitResult {
  const limits = getPlanLimits(plan);

  if (limits.emailPoolPerMonth === null) {
    return limitError(
      'EMAIL_NOT_INCLUDED',
      `Your ${plan} plan does not include email sending.`,
      { limit: 0, current: emailsSentThisPeriod, upgradeTo: getUpgradeTier(plan) }
    );
  }

  if (emailsSentThisPeriod >= limits.emailPoolPerMonth) {
    return limitError(
      'EMAIL_QUOTA_EXCEEDED',
      `You have used all ${limits.emailPoolPerMonth.toLocaleString()} email sends for this billing period.`,
      {
        limit: limits.emailPoolPerMonth,
        current: emailsSentThisPeriod,
        upgradeTo: getUpgradeTier(plan),
      }
    );
  }

  return { ok: true };
}

/**
 * Check whether the user can access a specific feature.
 */
export function checkFeatureAccess(
  plan: PlanId,
  feature: 'csvImportExport' | 'floorPlans' | 'budgetTracking' | 'taskTemplates' | 'vendorManagement'
): BillingLimitResult {
  const limits = getPlanLimits(plan);

  if (!limits[feature]) {
    const featureNames: Record<string, string> = {
      csvImportExport: 'CSV import/export',
      floorPlans: 'floor plans',
      budgetTracking: 'budget tracking',
      taskTemplates: 'task templates',
      vendorManagement: 'vendor management',
    };
    return limitError(
      'FEATURE_NOT_AVAILABLE',
      `${featureNames[feature] ?? feature} is not available on your ${plan} plan.`,
      { upgradeTo: getUpgradeTier(plan) }
    );
  }

  return { ok: true };
}

/**
 * Check whether the user can create another organization.
 */
export async function checkOrganizationLimit(
  db: ReturnType<typeof createDbClient>,
  userId: string,
  plan: PlanId
): Promise<BillingLimitResult> {
  const limits = getPlanLimits(plan);

  if (limits.maxOrganizations === 0) {
    return limitError(
      'ORGANIZATIONS_NOT_ALLOWED',
      `Your ${plan} plan does not support organizations.`,
      { limit: 0, current: 0, upgradeTo: getUpgradeTier(plan) }
    );
  }

  // Count orgs where the user is an admin (i.e., they created/own them)
  const orgRows = await db
    .select({ total: count() })
    .from(schema.organizationMember)
    .innerJoin(
      schema.organization,
      eq(schema.organizationMember.organizationId, schema.organization.id)
    )
    .where(
      and(
        eq(schema.organizationMember.userId, userId),
        eq(schema.organizationMember.role, 'admin'),
        isNull(schema.organization.deletedAt)
      )
    );
  const total = orgRows[0]?.total ?? 0;

  if (total >= limits.maxOrganizations) {
    return limitError(
      'ORGANIZATION_LIMIT_EXCEEDED',
      `Your ${plan} plan allows up to ${limits.maxOrganizations} organization${limits.maxOrganizations === 1 ? '' : 's'}.`,
      {
        limit: limits.maxOrganizations,
        current: total,
        upgradeTo: getUpgradeTier(plan),
      }
    );
  }

  return { ok: true };
}

/**
 * Check whether an organization can accept another member.
 */
export async function checkOrgMemberLimit(
  db: ReturnType<typeof createDbClient>,
  orgId: string,
  plan: PlanId
): Promise<BillingLimitResult> {
  const limits = getPlanLimits(plan);
  if (limits.maxOrgMembers === null) return { ok: true };

  const memberRows = await db
    .select({ total: count() })
    .from(schema.organizationMember)
    .where(eq(schema.organizationMember.organizationId, orgId));
  const total = memberRows[0]?.total ?? 0;

  if (total >= limits.maxOrgMembers) {
    return limitError(
      'ORG_MEMBER_LIMIT_EXCEEDED',
      `Your ${plan} plan allows up to ${limits.maxOrgMembers} member${limits.maxOrgMembers === 1 ? '' : 's'} per organization.`,
      {
        limit: limits.maxOrgMembers,
        current: total,
        upgradeTo: getUpgradeTier(plan),
      }
    );
  }

  return { ok: true };
}

// ==================== USAGE INCREMENTORS ====================

/**
 * Atomically increment the email counter for the current billing period.
 */
export async function incrementEmailCount(
  db: ReturnType<typeof createDbClient>,
  userId: string,
  count: number = 1
): Promise<void> {
  await db
    .update(schema.subscriptions)
    .set({
      emailsSentThisPeriod: sql`${schema.subscriptions.emailsSentThisPeriod} + ${count}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.subscriptions.userId, userId));
}

// ==================== SUBSCRIPTION ACTIVE CHECK ====================

/**
 * Returns the effective plan — if subscription is not active (past_due, canceled)
 * for a paid plan, returns 'free' to enforce free-tier limits.
 */
export function getEffectivePlan(
  plan: PlanId,
  status: SubscriptionStatus
): PlanId {
  if (isSubscriptionActive(status, plan)) return plan;
  return 'free';
}
