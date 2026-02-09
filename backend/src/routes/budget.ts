/**
 * Budget Routes
 *
 * CRUD endpoints for budget item and payment management within events.
 * Routes are scoped to /events/:eventUuid/budget
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, desc, asc, sql, count } from 'drizzle-orm';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';

const budget = new Hono<HonoEnv>();

// ==================== ENUMS ====================

const BUDGET_CATEGORIES = ['venue', 'catering', 'entertainment', 'decorations', 'photography', 'other'] as const;
const PAYMENT_STATUSES = ['pending', 'partial', 'paid', 'overdue'] as const;
const PAYMENT_METHODS = ['cash', 'check', 'credit_card', 'bank_transfer', 'other'] as const;

// ==================== SCHEMAS ====================

const createBudgetItemSchema = z.object({
  category: z.enum(BUDGET_CATEGORIES),
  itemName: z.string().min(1, 'Item name is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  estimatedCost: z.coerce.number().min(0).optional().nullable(),
  actualCost: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  paymentDueDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const updateBudgetItemSchema = z.object({
  category: z.enum(BUDGET_CATEGORIES).optional(),
  itemName: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  estimatedCost: z.coerce.number().min(0).optional().nullable(),
  actualCost: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  paymentDueDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const listBudgetItemsQuerySchema = z.object({
  category: z.enum(BUDGET_CATEGORIES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['itemName', 'category', 'estimatedCost', 'actualCost', 'paymentStatus', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().length(3).default('USD'),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
  paymentDate: z.coerce.date(),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const updatePaymentSchema = z.object({
  amount: z.coerce.number().min(0.01).optional(),
  currency: z.string().length(3).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().nullable(),
  paymentDate: z.coerce.date().optional(),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// ==================== HELPERS ====================

/**
 * Verify event ownership and return event info
 */
async function getEventByUuidForUser(
  db: ReturnType<typeof createDbClient>,
  eventUuid: string,
  userId: string
): Promise<{ id: number; budgetTotal: number | null; budgetCurrency: string | null } | null> {
  const [event] = await db
    .select({
      id: schema.events.id,
      budgetTotal: schema.events.budgetTotal,
      budgetCurrency: schema.events.budgetCurrency,
    })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.uuid, eventUuid),
        eq(schema.events.userId, userId),
        isNull(schema.events.deletedAt)
      )
    )
    .limit(1);

  return event ?? null;
}

/**
 * Compute total paid for a budget item and update its paymentStatus
 */
async function recomputePaymentStatus(
  db: ReturnType<typeof createDbClient>,
  budgetItemId: number
) {
  // Sum all payments for this budget item
  const [result] = await db
    .select({
      totalPaid: sql<number>`COALESCE(SUM(${schema.payments.amount}), 0)`,
    })
    .from(schema.payments)
    .where(eq(schema.payments.budgetItemId, budgetItemId));

  const totalPaid = result?.totalPaid ?? 0;

  // Get the budget item's actual cost
  const [item] = await db
    .select({
      actualCost: schema.budgetItems.actualCost,
      paymentDueDate: schema.budgetItems.paymentDueDate,
    })
    .from(schema.budgetItems)
    .where(eq(schema.budgetItems.id, budgetItemId))
    .limit(1);

  if (!item) return;

  const actualCost = item.actualCost ?? 0;
  let newStatus: 'pending' | 'partial' | 'paid' | 'overdue';

  if (actualCost > 0 && totalPaid >= actualCost) {
    newStatus = 'paid';
  } else if (totalPaid > 0) {
    newStatus = 'partial';
  } else if (item.paymentDueDate && item.paymentDueDate < new Date()) {
    newStatus = 'overdue';
  } else {
    newStatus = 'pending';
  }

  await db
    .update(schema.budgetItems)
    .set({ paymentStatus: newStatus, updatedAt: new Date() })
    .where(eq(schema.budgetItems.id, budgetItemId));
}

// ==================== ROUTES ====================

/**
 * GET /events/:eventUuid/budget/summary
 * Budget analytics (totals by category, spent vs estimated, status counts)
 */
budget.get('/summary', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;

  const db = createDbClient(c.env.DB);

  const event = await getEventByUuidForUser(db, eventUuid, user.id);
  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  const baseCondition = and(
    eq(schema.budgetItems.eventId, event.id),
    isNull(schema.budgetItems.deletedAt)
  );

  // Get totals
  const [totals] = await db
    .select({
      totalEstimated: sql<number>`COALESCE(SUM(${schema.budgetItems.estimatedCost}), 0)`,
      totalActual: sql<number>`COALESCE(SUM(${schema.budgetItems.actualCost}), 0)`,
      itemCount: count(),
    })
    .from(schema.budgetItems)
    .where(baseCondition);

  // Get total paid across all budget items
  const [paidResult] = await db
    .select({
      totalPaid: sql<number>`COALESCE(SUM(${schema.payments.amount}), 0)`,
    })
    .from(schema.payments)
    .innerJoin(schema.budgetItems, eq(schema.payments.budgetItemId, schema.budgetItems.id))
    .where(baseCondition);

  // Get by category
  const byCategory = await db
    .select({
      category: schema.budgetItems.category,
      estimated: sql<number>`COALESCE(SUM(${schema.budgetItems.estimatedCost}), 0)`,
      actual: sql<number>`COALESCE(SUM(${schema.budgetItems.actualCost}), 0)`,
      count: count(),
    })
    .from(schema.budgetItems)
    .where(baseCondition)
    .groupBy(schema.budgetItems.category);

  // Get paid amounts per category via a subquery
  const paidByCategory = await db
    .select({
      category: schema.budgetItems.category,
      paid: sql<number>`COALESCE(SUM(${schema.payments.amount}), 0)`,
    })
    .from(schema.payments)
    .innerJoin(schema.budgetItems, eq(schema.payments.budgetItemId, schema.budgetItems.id))
    .where(baseCondition)
    .groupBy(schema.budgetItems.category);

  const paidByCategoryMap: Record<string, number> = {};
  for (const row of paidByCategory) {
    if (row.category) paidByCategoryMap[row.category] = row.paid;
  }

  // Get by status
  const byStatus = await db
    .select({
      status: schema.budgetItems.paymentStatus,
      count: count(),
    })
    .from(schema.budgetItems)
    .where(baseCondition)
    .groupBy(schema.budgetItems.paymentStatus);

  return c.json({
    success: true,
    data: {
      totalBudget: event.budgetTotal,
      totalEstimated: totals?.totalEstimated ?? 0,
      totalActual: totals?.totalActual ?? 0,
      totalPaid: paidResult?.totalPaid ?? 0,
      currency: event.budgetCurrency ?? 'USD',
      itemCount: totals?.itemCount ?? 0,
      byCategory: byCategory.map((row) => ({
        category: row.category,
        estimated: row.estimated,
        actual: row.actual,
        paid: paidByCategoryMap[row.category!] ?? 0,
        count: row.count,
      })),
      byStatus: byStatus.map((row) => ({
        status: row.status,
        count: row.count,
      })),
    },
  });
});

/**
 * GET /events/:eventUuid/budget
 * List budget items (paginated, filterable)
 */
budget.get(
  '/',
  requireAuth,
  zValidator('query', listBudgetItemsQuerySchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const query = c.req.valid('query');
    const { category, paymentStatus, limit, offset, sortBy, sortOrder } = query;

    const db = createDbClient(c.env.DB);

    const event = await getEventByUuidForUser(db, eventUuid, user.id);
    if (!event) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    // Build where conditions
    const conditions = [
      eq(schema.budgetItems.eventId, event.id),
      isNull(schema.budgetItems.deletedAt),
    ];

    if (category) {
      conditions.push(eq(schema.budgetItems.category, category));
    }

    if (paymentStatus) {
      conditions.push(eq(schema.budgetItems.paymentStatus, paymentStatus));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(schema.budgetItems)
      .where(and(...conditions));

    // Determine sort column
    const sortColumnMap = {
      itemName: schema.budgetItems.itemName,
      category: schema.budgetItems.category,
      estimatedCost: schema.budgetItems.estimatedCost,
      actualCost: schema.budgetItems.actualCost,
      paymentStatus: schema.budgetItems.paymentStatus,
      createdAt: schema.budgetItems.createdAt,
    } as const;
    const sortColumn = sortColumnMap[sortBy as keyof typeof sortColumnMap];
    const orderFn = sortOrder === 'desc' ? desc : asc;

    // Get budget items
    const items = await db
      .select({
        id: schema.budgetItems.id,
        uuid: schema.budgetItems.uuid,
        category: schema.budgetItems.category,
        itemName: schema.budgetItems.itemName,
        description: schema.budgetItems.description,
        estimatedCost: schema.budgetItems.estimatedCost,
        actualCost: schema.budgetItems.actualCost,
        currency: schema.budgetItems.currency,
        paymentStatus: schema.budgetItems.paymentStatus,
        paymentDueDate: schema.budgetItems.paymentDueDate,
        notes: schema.budgetItems.notes,
        createdAt: schema.budgetItems.createdAt,
        updatedAt: schema.budgetItems.updatedAt,
      })
      .from(schema.budgetItems)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    // Get total paid for each budget item
    const itemIds = items.map((i) => i.id);
    let paidByItem: Record<number, number> = {};

    if (itemIds.length > 0) {
      const paidResults = await db
        .select({
          budgetItemId: schema.payments.budgetItemId,
          totalPaid: sql<number>`COALESCE(SUM(${schema.payments.amount}), 0)`,
        })
        .from(schema.payments)
        .where(sql`${schema.payments.budgetItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(schema.payments.budgetItemId);

      paidByItem = Object.fromEntries(paidResults.map((r) => [r.budgetItemId, r.totalPaid]));
    }

    const responseData = items.map((item) => ({
      uuid: item.uuid,
      category: item.category,
      itemName: item.itemName,
      description: item.description,
      estimatedCost: item.estimatedCost,
      actualCost: item.actualCost,
      currency: item.currency,
      paymentStatus: item.paymentStatus,
      paymentDueDate: item.paymentDueDate,
      notes: item.notes,
      totalPaid: paidByItem[item.id] ?? 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return c.json({
      success: true,
      data: responseData,
      meta: {
        total: countResult?.count ?? 0,
        limit,
        offset,
      },
    });
  }
);

/**
 * POST /events/:eventUuid/budget
 * Create a new budget item
 */
budget.post(
  '/',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', createBudgetItemSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const data = c.req.valid('json');

    const db = createDbClient(c.env.DB);

    const event = await getEventByUuidForUser(db, eventUuid, user.id);
    if (!event) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    const uuid = crypto.randomUUID();

    const [newItem] = await db
      .insert(schema.budgetItems)
      .values({
        uuid,
        eventId: event.id,
        category: data.category,
        itemName: data.itemName,
        description: data.description ?? null,
        estimatedCost: data.estimatedCost ?? null,
        actualCost: data.actualCost ?? null,
        currency: data.currency,
        paymentDueDate: data.paymentDueDate ?? null,
        notes: data.notes ?? null,
        paymentStatus: 'pending',
      })
      .returning();

    return c.json(
      {
        success: true,
        data: {
          uuid: newItem!.uuid,
          category: newItem!.category,
          itemName: newItem!.itemName,
          description: newItem!.description,
          estimatedCost: newItem!.estimatedCost,
          actualCost: newItem!.actualCost,
          currency: newItem!.currency,
          paymentStatus: newItem!.paymentStatus,
          paymentDueDate: newItem!.paymentDueDate,
          notes: newItem!.notes,
          totalPaid: 0,
          createdAt: newItem!.createdAt,
          updatedAt: newItem!.updatedAt,
        },
      },
      201
    );
  }
);

/**
 * GET /events/:eventUuid/budget/:uuid
 * Get a single budget item with nested payments
 */
budget.get('/:uuid', requireAuth, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const itemUuid = c.req.param('uuid')!;

  const db = createDbClient(c.env.DB);

  const event = await getEventByUuidForUser(db, eventUuid, user.id);
  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  const [item] = await db
    .select()
    .from(schema.budgetItems)
    .where(
      and(
        eq(schema.budgetItems.uuid, itemUuid),
        eq(schema.budgetItems.eventId, event.id),
        isNull(schema.budgetItems.deletedAt)
      )
    )
    .limit(1);

  if (!item) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Budget item not found' } },
      404
    );
  }

  // Get payments for this item
  const paymentsResult = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.budgetItemId, item.id))
    .orderBy(desc(schema.payments.paymentDate));

  const totalPaid = paymentsResult.reduce((sum, p) => sum + p.amount, 0);

  return c.json({
    success: true,
    data: {
      uuid: item.uuid,
      category: item.category,
      itemName: item.itemName,
      description: item.description,
      estimatedCost: item.estimatedCost,
      actualCost: item.actualCost,
      currency: item.currency,
      paymentStatus: item.paymentStatus,
      paymentDueDate: item.paymentDueDate,
      notes: item.notes,
      totalPaid,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      payments: paymentsResult.map((p) => ({
        uuid: p.uuid,
        amount: p.amount,
        currency: p.currency,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        referenceNumber: p.referenceNumber,
        notes: p.notes,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    },
  });
});

/**
 * PATCH /events/:eventUuid/budget/:uuid
 * Update a budget item
 */
budget.patch(
  '/:uuid',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateBudgetItemSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const itemUuid = c.req.param('uuid')!;
    const updates = c.req.valid('json');

    const db = createDbClient(c.env.DB);

    const event = await getEventByUuidForUser(db, eventUuid, user.id);
    if (!event) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    const [existing] = await db
      .select({ id: schema.budgetItems.id })
      .from(schema.budgetItems)
      .where(
        and(
          eq(schema.budgetItems.uuid, itemUuid),
          eq(schema.budgetItems.eventId, event.id),
          isNull(schema.budgetItems.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Budget item not found' } },
        404
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.itemName !== undefined) updateData.itemName = updates.itemName;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.estimatedCost !== undefined) updateData.estimatedCost = updates.estimatedCost;
    if (updates.actualCost !== undefined) updateData.actualCost = updates.actualCost;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.paymentDueDate !== undefined) updateData.paymentDueDate = updates.paymentDueDate;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    await db
      .update(schema.budgetItems)
      .set(updateData)
      .where(eq(schema.budgetItems.id, existing.id));

    // Recompute payment status if actualCost changed
    if (updates.actualCost !== undefined) {
      await recomputePaymentStatus(db, existing.id);
    }

    // Re-fetch to get latest status
    const [freshItem] = await db
      .select()
      .from(schema.budgetItems)
      .where(eq(schema.budgetItems.id, existing.id))
      .limit(1);

    // Get total paid
    const [paidResult] = await db
      .select({
        totalPaid: sql<number>`COALESCE(SUM(${schema.payments.amount}), 0)`,
      })
      .from(schema.payments)
      .where(eq(schema.payments.budgetItemId, existing.id));

    return c.json({
      success: true,
      data: {
        uuid: freshItem!.uuid,
        category: freshItem!.category,
        itemName: freshItem!.itemName,
        description: freshItem!.description,
        estimatedCost: freshItem!.estimatedCost,
        actualCost: freshItem!.actualCost,
        currency: freshItem!.currency,
        paymentStatus: freshItem!.paymentStatus,
        paymentDueDate: freshItem!.paymentDueDate,
        notes: freshItem!.notes,
        totalPaid: paidResult?.totalPaid ?? 0,
        createdAt: freshItem!.createdAt,
        updatedAt: freshItem!.updatedAt,
      },
    });
  }
);

/**
 * DELETE /events/:eventUuid/budget/:uuid
 * Soft delete a budget item
 */
budget.delete('/:uuid', requireAuth, requireVerifiedEmail, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const itemUuid = c.req.param('uuid')!;

  const db = createDbClient(c.env.DB);

  const event = await getEventByUuidForUser(db, eventUuid, user.id);
  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  const [existing] = await db
    .select({ id: schema.budgetItems.id })
    .from(schema.budgetItems)
    .where(
      and(
        eq(schema.budgetItems.uuid, itemUuid),
        eq(schema.budgetItems.eventId, event.id),
        isNull(schema.budgetItems.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Budget item not found' } },
      404
    );
  }

  await db
    .update(schema.budgetItems)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.budgetItems.id, existing.id));

  return c.json({
    success: true,
    data: { deleted: true },
  });
});

/**
 * POST /events/:eventUuid/budget/:uuid/payments
 * Add a payment to a budget item
 */
budget.post(
  '/:uuid/payments',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', createPaymentSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const itemUuid = c.req.param('uuid')!;
    const data = c.req.valid('json');

    const db = createDbClient(c.env.DB);

    const event = await getEventByUuidForUser(db, eventUuid, user.id);
    if (!event) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    const [budgetItem] = await db
      .select({ id: schema.budgetItems.id })
      .from(schema.budgetItems)
      .where(
        and(
          eq(schema.budgetItems.uuid, itemUuid),
          eq(schema.budgetItems.eventId, event.id),
          isNull(schema.budgetItems.deletedAt)
        )
      )
      .limit(1);

    if (!budgetItem) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Budget item not found' } },
        404
      );
    }

    const paymentUuid = crypto.randomUUID();

    const [newPayment] = await db
      .insert(schema.payments)
      .values({
        uuid: paymentUuid,
        budgetItemId: budgetItem.id,
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod ?? null,
        paymentDate: data.paymentDate,
        referenceNumber: data.referenceNumber ?? null,
        notes: data.notes ?? null,
      })
      .returning();

    // Recompute payment status
    await recomputePaymentStatus(db, budgetItem.id);

    return c.json(
      {
        success: true,
        data: {
          uuid: newPayment!.uuid,
          amount: newPayment!.amount,
          currency: newPayment!.currency,
          paymentMethod: newPayment!.paymentMethod,
          paymentDate: newPayment!.paymentDate,
          referenceNumber: newPayment!.referenceNumber,
          notes: newPayment!.notes,
          createdAt: newPayment!.createdAt,
          updatedAt: newPayment!.updatedAt,
        },
      },
      201
    );
  }
);

/**
 * PATCH /events/:eventUuid/budget/:uuid/payments/:paymentUuid
 * Update a payment
 */
budget.patch(
  '/:uuid/payments/:paymentUuid',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updatePaymentSchema),
  async (c) => {
    const user = c.get('user')!;
    const eventUuid = c.req.param('eventUuid')!;
    const itemUuid = c.req.param('uuid')!;
    const paymentUuid = c.req.param('paymentUuid')!;
    const updates = c.req.valid('json');

    const db = createDbClient(c.env.DB);

    const event = await getEventByUuidForUser(db, eventUuid, user.id);
    if (!event) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
        404
      );
    }

    const [budgetItem] = await db
      .select({ id: schema.budgetItems.id })
      .from(schema.budgetItems)
      .where(
        and(
          eq(schema.budgetItems.uuid, itemUuid),
          eq(schema.budgetItems.eventId, event.id),
          isNull(schema.budgetItems.deletedAt)
        )
      )
      .limit(1);

    if (!budgetItem) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Budget item not found' } },
        404
      );
    }

    const [existingPayment] = await db
      .select({ id: schema.payments.id })
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.uuid, paymentUuid),
          eq(schema.payments.budgetItemId, budgetItem.id)
        )
      )
      .limit(1);

    if (!existingPayment) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } },
        404
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.paymentMethod !== undefined) updateData.paymentMethod = updates.paymentMethod;
    if (updates.paymentDate !== undefined) updateData.paymentDate = updates.paymentDate;
    if (updates.referenceNumber !== undefined) updateData.referenceNumber = updates.referenceNumber;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const [updatedPayment] = await db
      .update(schema.payments)
      .set(updateData)
      .where(eq(schema.payments.id, existingPayment.id))
      .returning();

    // Recompute payment status
    await recomputePaymentStatus(db, budgetItem.id);

    return c.json({
      success: true,
      data: {
        uuid: updatedPayment!.uuid,
        amount: updatedPayment!.amount,
        currency: updatedPayment!.currency,
        paymentMethod: updatedPayment!.paymentMethod,
        paymentDate: updatedPayment!.paymentDate,
        referenceNumber: updatedPayment!.referenceNumber,
        notes: updatedPayment!.notes,
        createdAt: updatedPayment!.createdAt,
        updatedAt: updatedPayment!.updatedAt,
      },
    });
  }
);

/**
 * DELETE /events/:eventUuid/budget/:uuid/payments/:paymentUuid
 * Hard delete a payment
 */
budget.delete('/:uuid/payments/:paymentUuid', requireAuth, requireVerifiedEmail, async (c) => {
  const user = c.get('user')!;
  const eventUuid = c.req.param('eventUuid')!;
  const itemUuid = c.req.param('uuid')!;
  const paymentUuid = c.req.param('paymentUuid')!;

  const db = createDbClient(c.env.DB);

  const event = await getEventByUuidForUser(db, eventUuid, user.id);
  if (!event) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } },
      404
    );
  }

  const [budgetItem] = await db
    .select({ id: schema.budgetItems.id })
    .from(schema.budgetItems)
    .where(
      and(
        eq(schema.budgetItems.uuid, itemUuid),
        eq(schema.budgetItems.eventId, event.id),
        isNull(schema.budgetItems.deletedAt)
      )
    )
    .limit(1);

  if (!budgetItem) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Budget item not found' } },
      404
    );
  }

  const [existingPayment] = await db
    .select({ id: schema.payments.id })
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.uuid, paymentUuid),
        eq(schema.payments.budgetItemId, budgetItem.id)
      )
    )
    .limit(1);

  if (!existingPayment) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } },
      404
    );
  }

  await db
    .delete(schema.payments)
    .where(eq(schema.payments.id, existingPayment.id));

  // Recompute payment status
  await recomputePaymentStatus(db, budgetItem.id);

  return c.json({
    success: true,
    data: { deleted: true },
  });
});

export default budget;
