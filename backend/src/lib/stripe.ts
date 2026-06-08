/**
 * Stripe Client Factory
 *
 * Uses Stripe.createFetchHttpClient() which is required for Cloudflare Workers.
 */

import Stripe from 'stripe';
import type { Env } from '@/types/env';
import type { PlanId } from '@/lib/plan-limits';

export type BillingInterval = 'monthly' | 'annual';

export function createStripeClient(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover' as const,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

// ==================== LEGACY TIER PRICES ====================

/** @deprecated Use getStripeItemPriceId for unit-based pricing */
export function getStripePriceId(
  env: Env,
  plan: Exclude<PlanId, 'free'>,
  interval: BillingInterval
): string {
  const key =
    interval === 'monthly'
      ? (`STRIPE_PRICE_${plan.toUpperCase()}_MONTHLY` as keyof Env)
      : (`STRIPE_PRICE_${plan.toUpperCase()}_ANNUAL` as keyof Env);

  const priceId = env[key] as string | undefined;
  if (!priceId) {
    throw new Error(`Stripe price ID not configured: ${key}`);
  }
  return priceId;
}

// ==================== UNIT-BASED PRICES ====================

const ITEM_ENV_PREFIX: Record<string, string> = {
  events: 'STRIPE_PRICE_EVENTS',
  guests: 'STRIPE_PRICE_GUESTS',
  emails: 'STRIPE_PRICE_EMAILS',
  sms: 'STRIPE_PRICE_SMS',
  collaborators: 'STRIPE_PRICE_COLLABORATORS',
  custom_fields: 'STRIPE_PRICE_CUSTOM_FIELDS',
  org_members: 'STRIPE_PRICE_ORG_MEMBERS',
  floor_plans: 'STRIPE_PRICE_FLOOR_PLANS',
  organizations: 'STRIPE_PRICE_ORGANIZATIONS',
  audit_history: 'STRIPE_PRICE_AUDIT_HISTORY',
  sso: 'STRIPE_PRICE_SSO',
};

export function getStripeItemPriceId(
  env: Env,
  itemType: string,
  interval: BillingInterval
): string {
  const prefix = ITEM_ENV_PREFIX[itemType];
  if (!prefix) throw new Error(`Unknown item type: ${itemType}`);

  const key = (interval === 'monthly' ? `${prefix}_MONTHLY` : `${prefix}_ANNUAL`) as keyof Env;
  const priceId = env[key] as string | undefined;
  if (!priceId) throw new Error(`Stripe price ID not configured: ${key}`);
  return priceId;
}

/**
 * Reverse-lookup: given a Stripe price ID, return the itemType.
 * Used in webhook handlers to map Stripe items back to our types.
 */
export function getPriceIdItemType(env: Env, priceId: string): string | null {
  for (const [itemType, prefix] of Object.entries(ITEM_ENV_PREFIX)) {
    const monthlyKey = `${prefix}_MONTHLY` as keyof Env;
    const annualKey = `${prefix}_ANNUAL` as keyof Env;
    if (env[monthlyKey] === priceId || env[annualKey] === priceId) {
      return itemType;
    }
  }
  return null;
}
