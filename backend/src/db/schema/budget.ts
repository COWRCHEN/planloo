import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { events } from './events';
import { serviceProviders } from './providers';

/**
 * Budget Items Table
 * Individual budget line items for events
 */
export const budgetItems = sqliteTable('budget_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  category: text('category', {
    enum: ['venue', 'catering', 'entertainment', 'decorations', 'photography', 'other']
  }).notNull(),
  itemName: text('item_name').notNull(),
  description: text('description'),
  estimatedCost: real('estimated_cost'),
  actualCost: real('actual_cost'),
  currency: text('currency').default('USD').notNull(),
  serviceProviderId: integer('service_provider_id').references(() => serviceProviders.id, { onDelete: 'set null' }),
  paymentStatus: text('payment_status', {
    enum: ['pending', 'partial', 'paid', 'overdue']
  }).default('pending').notNull(),
  paymentDueDate: integer('payment_due_date', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => ({
  eventIdIdx: index('idx_budget_items_event_id').on(table.eventId),
  uuidIdx: index('idx_budget_items_uuid').on(table.uuid),
  categoryIdx: index('idx_budget_items_category').on(table.category),
  paymentStatusIdx: index('idx_budget_items_payment_status').on(table.paymentStatus)
}));

/**
 * Payments Table
 * Payment tracking for budget items
 */
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  budgetItemId: integer('budget_item_id').notNull().references(() => budgetItems.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  currency: text('currency').default('USD').notNull(),
  paymentMethod: text('payment_method', {
    enum: ['cash', 'check', 'credit_card', 'bank_transfer', 'other']
  }),
  paymentDate: integer('payment_date', { mode: 'timestamp' }).notNull(),
  referenceNumber: text('reference_number'),
  receiptUrl: text('receipt_url'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  budgetItemIdIdx: index('idx_payments_budget_item_id').on(table.budgetItemId),
  uuidIdx: index('idx_payments_uuid').on(table.uuid),
  paymentDateIdx: index('idx_payments_payment_date').on(table.paymentDate)
}));
