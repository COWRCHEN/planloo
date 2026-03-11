/**
 * Billing Hooks using TanStack Query
 *
 * Provides React hooks for billing/subscription operations.
 */

import { useQuery, useMutation } from '@tanstack/react-query';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

// ==================== TYPES ====================

export type PlanId = 'free' | 'personal' | 'planner' | 'agency' | 'enterprise';
export type BillingInterval = 'monthly' | 'annual';
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'free';

export interface PlanLimits {
  maxActiveEvents: number | null;
  maxGuests: number | null;
  emailPoolPerMonth: number | null;
  smsPoolPerMonth: number | null;
  maxCollaboratorsPerEvent: number | null;
  maxCustomFieldsPerEvent: number;
  maxOrganizations: number;
  maxOrgMembers: number | null;
  csvImportExport: boolean;
  floorPlans: boolean;
  budgetTracking: boolean;
  taskTemplates: boolean;
  vendorManagement: boolean;
  guestAuditHistory: boolean;
  sso: boolean;
}

export interface SubscriptionInfo {
  plan: PlanId;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  emailsSentThisPeriod: number;
  customLimits?: Record<string, unknown>;
}

export interface BillingData {
  subscription: SubscriptionInfo | null;
  limits: PlanLimits;
  usage: {
    totalEvents: number;
    totalGuests: number;
    totalOrganizations: number;
    emailsSentThisPeriod: number;
    emailPoolPerMonth: number | null;
    smsSentThisPeriod: number;
    smsPoolPerMonth: number | null;
  };
}

// ==================== QUERY KEYS ====================

export const billingKeys = {
  all: ['billing'] as const,
  detail: () => [...billingKeys.all, 'detail'] as const,
};

// ==================== HELPERS ====================

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? 'Request failed');
  }
  return json.data as T;
}

// ==================== HOOKS ====================

/**
 * Fetch current subscription, plan limits, and usage.
 */
export function useBilling() {
  return useQuery<BillingData>({
    queryKey: billingKeys.detail(),
    queryFn: async () => {
      const res = await fetch(`${API_URL}/billing`, { credentials: 'include' });
      return handleResponse<BillingData>(res);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create a Stripe Checkout session and redirect to the returned URL.
 */
export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async (input: { plan: Exclude<PlanId, 'free' | 'enterprise'>; interval: BillingInterval }) => {
      const res = await fetch(`${API_URL}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      });
      return handleResponse<{ url: string }>(res);
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

/**
 * Create a Stripe Customer Portal session and redirect to the returned URL.
 */
export function useCreatePortalSession() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/billing/portal`, {
        method: 'POST',
        credentials: 'include',
      });
      return handleResponse<{ url: string }>(res);
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}
