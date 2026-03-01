/**
 * Stripe Client Factory
 *
 * Uses Stripe.createFetchHttpClient() which is required for Cloudflare Workers.
 * The standard Node.js HTTP client is not available in Workers.
 */

import Stripe from 'stripe';
import type { Env } from '@/types/env';
import type { PlanId } from '@/lib/plan-limits';

export type BillingInterval = 'monthly' | 'annual';

/**
 * Create a Stripe client using the fetch-based HTTP client (required for Workers).
 */
export function createStripeClient(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover' as const,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/**
 * Look up the Stripe price ID for a given plan + interval from env vars.
 */
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
