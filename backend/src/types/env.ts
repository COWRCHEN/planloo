/**
 * Cloudflare Workers Environment Types
 *
 * Defines the bindings and environment variables available in Workers.
 */

import type { EventAccess } from '@/lib/event-access';
import type { PlanLimits } from '@/lib/plan-limits';

export interface Env {
  // Database binding
  DB: D1Database;

  // Better Auth secret (required)
  BETTER_AUTH_SECRET: string;

  // Environment
  ENVIRONMENT: 'development' | 'staging' | 'production';

  // Frontend URL for CORS and redirects
  FRONTEND_URL: string;

  // OAuth providers (optional)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;

  // Email service (optional)
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;

  // Rate limiting KV namespace (optional)
  RATE_LIMIT_KV?: KVNamespace;

  // R2 bucket for uploads (optional)
  UPLOADS_BUCKET?: R2Bucket;
  R2_PUBLIC_URL?: string;

  // Stripe (optional until Phase 3 goes live)
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;

  // Legacy tier Stripe Price IDs (kept for existing subscribers)
  STRIPE_PRICE_PERSONAL_MONTHLY?: string;
  STRIPE_PRICE_PLANNER_MONTHLY?: string;
  STRIPE_PRICE_AGENCY_MONTHLY?: string;
  STRIPE_PRICE_PERSONAL_ANNUAL?: string;
  STRIPE_PRICE_PLANNER_ANNUAL?: string;
  STRIPE_PRICE_AGENCY_ANNUAL?: string;

  // Basic plan bundle price IDs
  STRIPE_PRICE_BASIC_PLAN_MONTHLY?: string;
  STRIPE_PRICE_BASIC_PLAN_ANNUAL?: string;

  // Unit-based Stripe Price IDs (monthly)
  STRIPE_PRICE_EVENTS_MONTHLY?: string;
  STRIPE_PRICE_GUESTS_MONTHLY?: string;
  STRIPE_PRICE_EMAILS_MONTHLY?: string;
  STRIPE_PRICE_SMS_MONTHLY?: string;
  STRIPE_PRICE_COLLABORATORS_MONTHLY?: string;
  STRIPE_PRICE_CUSTOM_FIELDS_MONTHLY?: string;
  STRIPE_PRICE_ORG_MEMBERS_MONTHLY?: string;
  STRIPE_PRICE_FLOOR_PLANS_MONTHLY?: string;
  STRIPE_PRICE_ORGANIZATIONS_MONTHLY?: string;
  STRIPE_PRICE_AUDIT_HISTORY_MONTHLY?: string;
  STRIPE_PRICE_SSO_MONTHLY?: string;

  // Unit-based Stripe Price IDs (annual)
  STRIPE_PRICE_EVENTS_ANNUAL?: string;
  STRIPE_PRICE_GUESTS_ANNUAL?: string;
  STRIPE_PRICE_EMAILS_ANNUAL?: string;
  STRIPE_PRICE_SMS_ANNUAL?: string;
  STRIPE_PRICE_COLLABORATORS_ANNUAL?: string;
  STRIPE_PRICE_CUSTOM_FIELDS_ANNUAL?: string;
  STRIPE_PRICE_ORG_MEMBERS_ANNUAL?: string;
  STRIPE_PRICE_FLOOR_PLANS_ANNUAL?: string;
  STRIPE_PRICE_ORGANIZATIONS_ANNUAL?: string;
  STRIPE_PRICE_AUDIT_HISTORY_ANNUAL?: string;
  STRIPE_PRICE_SSO_ANNUAL?: string;

}

/**
 * Type helper for Hono context with environment bindings
 */
export type HonoEnv = {
  Bindings: Env;
  Variables: {
    user?: {
      id: string;
      email: string;
      name: string | null;
      emailVerified: boolean;
      image: string | null;
      platformRole: 'super_admin' | 'operator' | 'user';
      isActive: boolean;
    };
    session?: {
      id: string;
      userId: string;
      expiresAt: Date;
    };
    eventAccess?: EventAccess;
    subscription?: {
      plan: 'free' | 'personal' | 'planner' | 'agency' | 'enterprise';
      status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'free';
      currentPeriodEnd: Date | null;
      cancelAtPeriodEnd: boolean;
      emailsSentThisPeriod: number;
    };
    planLimits?: PlanLimits;
  };
};
