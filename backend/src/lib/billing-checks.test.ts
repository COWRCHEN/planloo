import { describe, it, expect } from 'vitest';
import { checkEmailQuota, checkFeatureAccess, getEffectivePlan } from './billing-checks';
import { PLAN_LIMITS } from './plan-limits';
import type { PlanLimits } from './plan-limits';

// ==================== checkEmailQuota ====================

describe('checkEmailQuota', () => {
  const limitsWithPool: PlanLimits = { ...PLAN_LIMITS.personal }; // emailPoolPerMonth: 1000
  const limitsNoPool: PlanLimits = { ...PLAN_LIMITS.free }; // emailPoolPerMonth: null

  it('returns ok when emails sent is below the pool limit', () => {
    const result = checkEmailQuota(500, limitsWithPool);
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns error when emailPoolPerMonth is null (no email sending on plan)', () => {
    const result = checkEmailQuota(0, limitsNoPool);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('EMAIL_NOT_INCLUDED');
  });

  it('returns error when emails sent equals the pool limit', () => {
    const result = checkEmailQuota(1000, limitsWithPool);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('EMAIL_QUOTA_EXCEEDED');
    expect(result.error?.limit).toBe(1000);
    expect(result.error?.current).toBe(1000);
  });

  it('returns error when emails sent exceeds the pool limit', () => {
    const result = checkEmailQuota(1001, limitsWithPool);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('EMAIL_QUOTA_EXCEEDED');
  });

  it('always includes upgradeUrl in the error', () => {
    const result = checkEmailQuota(1000, limitsWithPool);
    expect(result.error?.upgradeUrl).toBeTruthy();
  });

  it('returns ok when emails sent is zero and pool is available', () => {
    const result = checkEmailQuota(0, limitsWithPool);
    expect(result.ok).toBe(true);
  });
});

// ==================== checkFeatureAccess ====================

describe('checkFeatureAccess', () => {
  const fullLimits: PlanLimits = { ...PLAN_LIMITS.agency };
  const freeLimits: PlanLimits = { ...PLAN_LIMITS.free };

  it('returns ok when csvImportExport is enabled', () => {
    expect(checkFeatureAccess('csvImportExport', fullLimits).ok).toBe(true);
  });

  it('returns ok when floorPlans is enabled', () => {
    expect(checkFeatureAccess('floorPlans', fullLimits).ok).toBe(true);
  });

  it('returns ok when budgetTracking is enabled', () => {
    expect(checkFeatureAccess('budgetTracking', fullLimits).ok).toBe(true);
  });

  it('returns ok when taskTemplates is enabled', () => {
    expect(checkFeatureAccess('taskTemplates', fullLimits).ok).toBe(true);
  });

  it('returns ok when vendorManagement is enabled', () => {
    expect(checkFeatureAccess('vendorManagement', fullLimits).ok).toBe(true);
  });

  it('returns error when csvImportExport is disabled on free plan', () => {
    const result = checkFeatureAccess('csvImportExport', freeLimits);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('FEATURE_NOT_AVAILABLE');
    expect(result.error?.message).toContain('CSV import/export');
  });

  it('returns error when floorPlans is disabled', () => {
    const result = checkFeatureAccess('floorPlans', freeLimits);
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('floor plans');
  });

  it('returns error when budgetTracking is disabled', () => {
    const result = checkFeatureAccess('budgetTracking', freeLimits);
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('budget tracking');
  });

  it('returns error when taskTemplates is disabled', () => {
    const result = checkFeatureAccess('taskTemplates', freeLimits);
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('task templates');
  });

  it('returns error when vendorManagement is disabled', () => {
    const result = checkFeatureAccess('vendorManagement', freeLimits);
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('vendor management');
  });

  it('always includes upgradeUrl in the error', () => {
    const result = checkFeatureAccess('floorPlans', freeLimits);
    expect(result.error?.upgradeUrl).toBeTruthy();
  });
});

// ==================== getEffectivePlan ====================

describe('getEffectivePlan', () => {
  it('enterprise is never downgraded regardless of status', () => {
    expect(getEffectivePlan('enterprise', 'canceled')).toBe('enterprise');
    expect(getEffectivePlan('enterprise', 'past_due')).toBe('enterprise');
    expect(getEffectivePlan('enterprise', 'incomplete')).toBe('enterprise');
    expect(getEffectivePlan('enterprise', 'active')).toBe('enterprise');
  });

  it('returns the plan when subscription is active', () => {
    expect(getEffectivePlan('personal', 'active')).toBe('personal');
    expect(getEffectivePlan('planner', 'active')).toBe('planner');
    expect(getEffectivePlan('agency', 'active')).toBe('agency');
  });

  it('returns the plan when subscription is trialing', () => {
    expect(getEffectivePlan('personal', 'trialing')).toBe('personal');
    expect(getEffectivePlan('planner', 'trialing')).toBe('planner');
  });

  it('downgrades to free when subscription is canceled', () => {
    expect(getEffectivePlan('personal', 'canceled')).toBe('free');
    expect(getEffectivePlan('planner', 'canceled')).toBe('free');
    expect(getEffectivePlan('agency', 'canceled')).toBe('free');
  });

  it('downgrades to free when subscription is past_due', () => {
    expect(getEffectivePlan('personal', 'past_due')).toBe('free');
    expect(getEffectivePlan('agency', 'past_due')).toBe('free');
  });

  it('downgrades to free when subscription is incomplete', () => {
    expect(getEffectivePlan('personal', 'incomplete')).toBe('free');
  });

  it('free plan with free status stays free', () => {
    expect(getEffectivePlan('free', 'free')).toBe('free');
  });
});
