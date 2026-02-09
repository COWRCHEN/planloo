/**
 * Budget Hooks using TanStack Query
 *
 * Provides React hooks for budget item and payment operations with proper
 * caching, loading states, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ==================== ENUMS ====================

export const BUDGET_CATEGORIES = ['venue', 'catering', 'entertainment', 'decorations', 'photography', 'other'] as const;
export const PAYMENT_STATUSES = ['pending', 'partial', 'paid', 'overdue'] as const;
export const PAYMENT_METHODS = ['cash', 'check', 'credit_card', 'bank_transfer', 'other'] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// ==================== TYPES ====================

export interface BudgetItemResponse {
  uuid: string;
  category: BudgetCategory;
  itemName: string;
  description: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentDueDate: string | null;
  notes: string | null;
  totalPaid: number;
  createdAt: string;
  updatedAt: string;
  payments?: PaymentResponse[];
}

export interface PaymentResponse {
  uuid: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod | null;
  paymentDate: string;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetSummaryResponse {
  totalBudget: number | null;
  totalEstimated: number;
  totalActual: number;
  totalPaid: number;
  currency: string;
  itemCount: number;
  byCategory: {
    category: BudgetCategory;
    estimated: number;
    actual: number;
    paid: number;
    count: number;
  }[];
  byStatus: {
    status: PaymentStatus;
    count: number;
  }[];
}

export interface CreateBudgetItemInput {
  category: BudgetCategory;
  itemName: string;
  description?: string | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
  currency?: string;
  paymentDueDate?: Date | null;
  notes?: string | null;
}

export interface UpdateBudgetItemInput {
  category?: BudgetCategory;
  itemName?: string;
  description?: string | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
  currency?: string;
  paymentDueDate?: Date | null;
  notes?: string | null;
}

export interface AllEventsBudgetSummary {
  totalEstimated: number;
  totalActual: number;
  totalPaid: number;
  totalItems: number;
  events: {
    uuid: string;
    title: string;
    startDate: string;
    budgetTotal: number | null;
    totalEstimated: number;
    totalActual: number;
    totalPaid: number;
    itemCount: number;
  }[];
}

export interface ListBudgetItemsQuery {
  category?: BudgetCategory;
  paymentStatus?: PaymentStatus;
  limit?: number;
  offset?: number;
  sortBy?: 'itemName' | 'category' | 'estimatedCost' | 'actualCost' | 'paymentStatus' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreatePaymentInput {
  amount: number;
  currency?: string;
  paymentMethod?: PaymentMethod | null;
  paymentDate: Date;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface UpdatePaymentInput {
  amount?: number;
  currency?: string;
  paymentMethod?: PaymentMethod | null;
  paymentDate?: Date;
  referenceNumber?: string | null;
  notes?: string | null;
}

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

// ==================== QUERY KEYS ====================

export const budgetKeys = {
  all: ['budget'] as const,
  lists: () => [...budgetKeys.all, 'list'] as const,
  list: (eventUuid: string, filters?: Partial<ListBudgetItemsQuery>) =>
    [...budgetKeys.lists(), eventUuid, filters] as const,
  details: () => [...budgetKeys.all, 'detail'] as const,
  detail: (eventUuid: string, itemUuid: string) =>
    [...budgetKeys.details(), eventUuid, itemUuid] as const,
  summary: (eventUuid: string) => [...budgetKeys.all, 'summary', eventUuid] as const,
  allEventsSummary: () => [...budgetKeys.all, 'all-events-summary'] as const,
};

// ==================== HELPERS ====================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  return data;
}

// ==================== BUDGET ITEM HOOKS ====================

interface BudgetItemsQueryResult {
  items: BudgetItemResponse[];
  meta: { total: number; limit: number; offset: number } | undefined;
}

/**
 * Hook to fetch paginated list of budget items for an event
 */
export function useBudgetItems(
  eventUuid: string,
  filters?: Partial<ListBudgetItemsQuery>
) {
  return useQuery<BudgetItemsQueryResult>({
    queryKey: budgetKeys.list(eventUuid, filters),
    queryFn: async (): Promise<BudgetItemsQueryResult> => {
      const params = new URLSearchParams();
      if (filters?.category) params.set('category', filters.category);
      if (filters?.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
      if (filters?.limit) params.set('limit', filters.limit.toString());
      if (filters?.offset) params.set('offset', filters.offset.toString());
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);

      const url = `${API_URL}/events/${eventUuid}/budget${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      const result = await handleResponse<BudgetItemResponse[]>(response);
      return {
        items: result.data ?? [],
        meta: result.meta,
      };
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook to fetch a single budget item with payments
 */
export function useBudgetItem(eventUuid: string, itemUuid: string | undefined) {
  return useQuery<BudgetItemResponse | undefined>({
    queryKey: budgetKeys.detail(eventUuid, itemUuid ?? ''),
    queryFn: async (): Promise<BudgetItemResponse | undefined> => {
      if (!itemUuid) throw new Error('Budget item UUID is required');
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/budget/${itemUuid}`,
        { credentials: 'include' }
      );
      const result = await handleResponse<BudgetItemResponse>(response);
      return result.data;
    },
    enabled: !!eventUuid && !!itemUuid,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook to fetch budget summary/analytics for an event
 */
export function useBudgetSummary(eventUuid: string) {
  return useQuery<BudgetSummaryResponse | undefined>({
    queryKey: budgetKeys.summary(eventUuid),
    queryFn: async (): Promise<BudgetSummaryResponse | undefined> => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/budget/summary`,
        { credentials: 'include' }
      );
      const result = await handleResponse<BudgetSummaryResponse>(response);
      return result.data;
    },
    enabled: !!eventUuid,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook to fetch cross-event budget summary for the current user
 */
export function useAllEventsBudgetSummary() {
  return useQuery<AllEventsBudgetSummary>({
    queryKey: budgetKeys.allEventsSummary(),
    queryFn: async (): Promise<AllEventsBudgetSummary> => {
      const response = await fetch(`${API_URL}/budget/summary`, {
        credentials: 'include',
      });
      const result = await handleResponse<AllEventsBudgetSummary>(response);
      return result.data!;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ==================== BUDGET ITEM MUTATIONS ====================

/**
 * Hook to create a new budget item
 */
export function useCreateBudgetItem(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBudgetItemInput) => {
      const response = await fetch(`${API_URL}/events/${eventUuid}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await handleResponse<BudgetItemResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(eventUuid) });
    },
  });
}

/**
 * Hook to update an existing budget item
 */
export function useUpdateBudgetItem(eventUuid: string, itemUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateBudgetItemInput) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/budget/${itemUuid}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      const result = await handleResponse<BudgetItemResponse>(response);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(eventUuid) });
      if (data) {
        queryClient.setQueryData(budgetKeys.detail(eventUuid, itemUuid), data);
      }
    },
  });
}

/**
 * Hook to delete a budget item
 */
export function useDeleteBudgetItem(eventUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemUuid: string) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/budget/${itemUuid}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      await handleResponse<{ deleted: boolean }>(response);
      return itemUuid;
    },
    onSuccess: (itemUuid) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(eventUuid) });
      queryClient.removeQueries({ queryKey: budgetKeys.detail(eventUuid, itemUuid) });
    },
  });
}

// ==================== PAYMENT MUTATIONS ====================

/**
 * Hook to create a new payment for a budget item
 */
export function useCreatePayment(eventUuid: string, itemUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentInput) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/budget/${itemUuid}/payments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      const result = await handleResponse<PaymentResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.detail(eventUuid, itemUuid) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(eventUuid) });
    },
  });
}

/**
 * Hook to update an existing payment
 */
export function useUpdatePayment(eventUuid: string, itemUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentUuid, data }: { paymentUuid: string; data: UpdatePaymentInput }) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/budget/${itemUuid}/payments/${paymentUuid}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      const result = await handleResponse<PaymentResponse>(response);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.detail(eventUuid, itemUuid) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(eventUuid) });
    },
  });
}

/**
 * Hook to delete a payment
 */
export function useDeletePayment(eventUuid: string, itemUuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentUuid: string) => {
      const response = await fetch(
        `${API_URL}/events/${eventUuid}/budget/${itemUuid}/payments/${paymentUuid}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      await handleResponse<{ deleted: boolean }>(response);
      return paymentUuid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.detail(eventUuid, itemUuid) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(eventUuid) });
    },
  });
}
