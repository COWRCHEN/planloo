import { describe, it, expect } from 'vitest';
import {
  PLAN_LIMITS,
  ENTERPRISE_EMAIL_PER_GUEST,
  ENTERPRISE_SMS_PER_GUEST,
  resolveEnterpriseLimits,
  getPlanLimits,
  isSubscriptionActive,
  getUpgradeTier,
} from './plan-limits';

describe('getPlanLimits', () => {
  it('returns correct limits for free plan', () => {
    expect(getPlanLimits('free')).toEqual(PLAN_LIMITS.free);
  });

  it('returns correct limits for personal plan', () => {
    expect(getPlanLimits('personal')).toEqual(PLAN_LIMITS.personal);
  });

  it('returns correct limits for planner plan', () => {
    expect(getPlanLimits('planner')).toEqual(PLAN_LIMITS.planner);
  });

  it('returns correct limits for agency plan', () => {
    expect(getPlanLimits('agency')).toEqual(PLAN_LIMITS.agency);
  });

  it('returns correct limits for enterprise plan', () => {
    expect(getPlanLimits('enterprise')).toEqual(PLAN_LIMITS.enterprise);
  });
});

describe('isSubscriptionActive', () => {
  it('free plan is always active regardless of status', () => {
    expect(isSubscriptionActive('active', 'free')).toBe(true);
    expect(isSubscriptionActive('canceled', 'free')).toBe(true);
    expect(isSubscriptionActive('past_due', 'free')).toBe(true);
    expect(isSubscriptionActive('free', 'free')).toBe(true);
  });

  it('paid plan with active status is active', () => {
    expect(isSubscriptionActive('active', 'personal')).toBe(true);
    expect(isSubscriptionActive('active', 'planner')).toBe(true);
    expect(isSubscriptionActive('active', 'agency')).toBe(true);
    expect(isSubscriptionActive('active', 'enterprise')).toBe(true);
  });

  it('paid plan with trialing status is active', () => {
    expect(isSubscriptionActive('trialing', 'personal')).toBe(true);
    expect(isSubscriptionActive('trialing', 'planner')).toBe(true);
  });

  it('paid plan with past_due status is not active', () => {
    expect(isSubscriptionActive('past_due', 'personal')).toBe(false);
    expect(isSubscriptionActive('past_due', 'planner')).toBe(false);
  });

  it('paid plan with canceled status is not active', () => {
    expect(isSubscriptionActive('canceled', 'personal')).toBe(false);
    expect(isSubscriptionActive('canceled', 'agency')).toBe(false);
  });

  it('paid plan with incomplete status is not active', () => {
    expect(isSubscriptionActive('incomplete', 'personal')).toBe(false);
  });
});

describe('getUpgradeTier', () => {
  it('free upgrades to personal', () => {
    expect(getUpgradeTier('free')).toBe('personal');
  });

  it('personal upgrades to planner', () => {
    expect(getUpgradeTier('personal')).toBe('planner');
  });

  it('planner upgrades to agency', () => {
    expect(getUpgradeTier('planner')).toBe('agency');
  });

  it('agency upgrades to enterprise', () => {
    expect(getUpgradeTier('agency')).toBe('enterprise');
  });

  it('enterprise has no upgrade tier', () => {
    expect(getUpgradeTier('enterprise')).toBeNull();
  });
});

describe('resolveEnterpriseLimits', () => {
  it('returns enterprise defaults when customLimits is null', () => {
    const result = resolveEnterpriseLimits(null);
    expect(result).toEqual(PLAN_LIMITS.enterprise);
  });

  it('applies partial custom overrides on top of enterprise defaults', () => {
    const result = resolveEnterpriseLimits({ maxGuests: 500 });
    expect(result.maxGuests).toBe(500);
    expect(result.maxActiveEvents).toBeNull(); // enterprise default
    expect(result.csvImportExport).toBe(true); // enterprise default
  });

  it('derives email pool from maxGuests when emailPoolPerMonth is null', () => {
    const result = resolveEnterpriseLimits({ maxGuests: 1000 });
    expect(result.emailPoolPerMonth).toBe(Math.ceil(1000 * ENTERPRISE_EMAIL_PER_GUEST));
  });

  it('derives sms pool from maxGuests when smsPoolPerMonth is null', () => {
    const result = resolveEnterpriseLimits({ maxGuests: 1000 });
    expect(result.smsPoolPerMonth).toBe(Math.ceil(1000 * ENTERPRISE_SMS_PER_GUEST));
  });

  it('does not override explicitly set emailPoolPerMonth', () => {
    const result = resolveEnterpriseLimits({ maxGuests: 1000, emailPoolPerMonth: 5000 });
    expect(result.emailPoolPerMonth).toBe(5000);
  });

  it('does not override explicitly set smsPoolPerMonth', () => {
    const result = resolveEnterpriseLimits({ maxGuests: 1000, smsPoolPerMonth: 200 });
    expect(result.smsPoolPerMonth).toBe(200);
  });

  it('leaves pools null when maxGuests is null (truly unlimited deal)', () => {
    const result = resolveEnterpriseLimits({ maxGuests: null });
    expect(result.emailPoolPerMonth).toBeNull();
    expect(result.smsPoolPerMonth).toBeNull();
  });

  it('rounds up fractional pool values', () => {
    // ENTERPRISE_SMS_PER_GUEST = 1, so 3 guests = 3 sms (no rounding needed)
    // ENTERPRISE_EMAIL_PER_GUEST = 10, so 3 guests = 30 emails
    const result = resolveEnterpriseLimits({ maxGuests: 3 });
    expect(result.emailPoolPerMonth).toBe(30);
    expect(result.smsPoolPerMonth).toBe(3);
  });

  it('can disable a feature flag via custom limits', () => {
    const result = resolveEnterpriseLimits({ sso: false });
    expect(result.sso).toBe(false);
  });
});
