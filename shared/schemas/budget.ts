/**
 * Budget Schemas
 *
 * Shared Zod schemas and TypeScript types for budget items and payments.
 * Used by both frontend and backend for validation and type safety.
 */

import { z } from 'zod';

// ==================== ENUMS ====================

export const BUDGET_CATEGORIES = ['venue', 'catering', 'entertainment', 'decorations', 'photography', 'other'] as const;
export const PAYMENT_STATUSES = ['pending', 'partial', 'paid', 'overdue'] as const;
export const PAYMENT_METHODS = ['cash', 'check', 'credit_card', 'bank_transfer', 'other'] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// ==================== SCHEMAS ====================

/**
 * Schema for creating a new budget item
 */
export const createBudgetItemSchema = z.object({
  category: z.enum(BUDGET_CATEGORIES),
  itemName: z.string().min(1, 'Item name is required').max(200, 'Item name must be less than 200 characters'),
  description: z.string().max(1000).optional().nullable(),
  estimatedCost: z.coerce.number().min(0).optional().nullable(),
  actualCost: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  paymentDueDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

/**
 * Schema for updating an existing budget item
 */
export const updateBudgetItemSchema = z.object({
  category: z.enum(BUDGET_CATEGORIES).optional(),
  itemName: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  estimatedCost: z.coerce.number().min(0).optional().nullable(),
  actualCost: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  paymentDueDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

/**
 * Schema for listing budget items query parameters
 */
export const listBudgetItemsQuerySchema = z.object({
  category: z.enum(BUDGET_CATEGORIES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['itemName', 'category', 'estimatedCost', 'actualCost', 'paymentStatus', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schema for creating a new payment
 */
export const createPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().length(3).default('USD'),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
  paymentDate: z.coerce.date(),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * Schema for updating an existing payment
 */
export const updatePaymentSchema = z.object({
  amount: z.coerce.number().min(0.01).optional(),
  currency: z.string().length(3).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
  paymentDate: z.coerce.date().optional(),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// ==================== TYPES ====================

export type CreateBudgetItemInput = z.infer<typeof createBudgetItemSchema>;
export type UpdateBudgetItemInput = z.infer<typeof updateBudgetItemSchema>;
export type ListBudgetItemsQuery = z.infer<typeof listBudgetItemsQuerySchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

/**
 * Budget item response type (from API)
 */
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

/**
 * Payment response type (from API)
 */
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

/**
 * Budget summary response type (from API)
 */
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
