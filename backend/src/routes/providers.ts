/**
 * Provider Routes
 *
 * CRUD endpoints for the global service provider directory.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, desc, asc, like, or, count } from 'drizzle-orm';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';

const providers = new Hono<HonoEnv>();

// ==================== SCHEMAS ====================

const PROVIDER_CATEGORIES = ['catering', 'photography', 'dj', 'florist', 'venue', 'decoration', 'other'] as const;
const PRICE_RANGES = ['$$', '$$$', '$$$$'] as const;

const createProviderSchema = z.object({
  businessName: z.string().min(1).max(200),
  contactName: z.string().max(200).optional().nullable(),
  email: z.string().email(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  category: z.enum(PROVIDER_CATEGORIES),
  description: z.string().max(2000).optional().nullable(),
  servicesOffered: z.array(z.string()).optional().nullable(),
  priceRange: z.enum(PRICE_RANGES).optional().nullable(),
  locationCity: z.string().max(100).optional().nullable(),
  locationState: z.string().max(100).optional().nullable(),
  locationCountry: z.string().max(100).optional().nullable(),
});

const updateProviderSchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
  contactName: z.string().max(200).optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  category: z.enum(PROVIDER_CATEGORIES).optional(),
  description: z.string().max(2000).optional().nullable(),
  servicesOffered: z.array(z.string()).optional().nullable(),
  priceRange: z.enum(PRICE_RANGES).optional().nullable(),
  locationCity: z.string().max(100).optional().nullable(),
  locationState: z.string().max(100).optional().nullable(),
  locationCountry: z.string().max(100).optional().nullable(),
});

const listProvidersQuerySchema = z.object({
  search: z.string().max(200).optional(),
  category: z.enum(PROVIDER_CATEGORIES).optional(),
  priceRange: z.enum(PRICE_RANGES).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['businessName', 'ratingAverage', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ==================== HELPERS ====================

function parseServicesOffered(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatProvider(p: typeof schema.serviceProviders.$inferSelect) {
  return {
    uuid: p.uuid,
    businessName: p.businessName,
    contactName: p.contactName,
    email: p.email,
    phone: p.phone,
    website: p.website,
    category: p.category,
    description: p.description,
    servicesOffered: parseServicesOffered(p.servicesOffered),
    priceRange: p.priceRange,
    locationCity: p.locationCity,
    locationState: p.locationState,
    locationCountry: p.locationCountry,
    ratingAverage: p.ratingAverage,
    ratingCount: p.ratingCount,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ==================== ROUTES ====================

/**
 * GET /providers
 * List/search providers
 */
providers.get(
  '/',
  requireAuth,
  zValidator('query', listProvidersQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const { search, category, priceRange, city, state, limit, offset, sortBy, sortOrder } = query;

    const db = createDbClient(c.env.DB);

    const conditions = [
      eq(schema.serviceProviders.isActive, true),
      isNull(schema.serviceProviders.deletedAt),
    ];

    if (search) {
      conditions.push(
        or(
          like(schema.serviceProviders.businessName, `%${search}%`),
          like(schema.serviceProviders.description, `%${search}%`)
        )!
      );
    }
    if (category) conditions.push(eq(schema.serviceProviders.category, category));
    if (priceRange) conditions.push(eq(schema.serviceProviders.priceRange, priceRange));
    if (city) conditions.push(eq(schema.serviceProviders.locationCity, city));
    if (state) conditions.push(eq(schema.serviceProviders.locationState, state));

    const [countResult] = await db
      .select({ count: count() })
      .from(schema.serviceProviders)
      .where(and(...conditions));

    const sortColumnMap = {
      businessName: schema.serviceProviders.businessName,
      ratingAverage: schema.serviceProviders.ratingAverage,
      createdAt: schema.serviceProviders.createdAt,
    } as const;
    const sortColumn = sortColumnMap[sortBy as keyof typeof sortColumnMap];
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const items = await db
      .select()
      .from(schema.serviceProviders)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    return c.json({
      success: true,
      data: items.map(formatProvider),
      meta: {
        total: countResult?.count ?? 0,
        limit,
        offset,
      },
    });
  }
);

/**
 * GET /providers/:uuid
 * Get provider detail
 */
providers.get('/:uuid', requireAuth, async (c) => {
  const uuid = c.req.param('uuid')!;
  const db = createDbClient(c.env.DB);

  const [provider] = await db
    .select()
    .from(schema.serviceProviders)
    .where(
      and(
        eq(schema.serviceProviders.uuid, uuid),
        eq(schema.serviceProviders.isActive, true),
        isNull(schema.serviceProviders.deletedAt)
      )
    )
    .limit(1);

  if (!provider) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Provider not found' } },
      404
    );
  }

  return c.json({ success: true, data: formatProvider(provider) });
});

/**
 * POST /providers
 * Create provider
 */
providers.post(
  '/',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', createProviderSchema),
  async (c) => {
    const user = c.get('user')!;
    const data = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const uuid = crypto.randomUUID();

    const [newProvider] = await db
      .insert(schema.serviceProviders)
      .values({
        uuid,
        userId: user.id,
        businessName: data.businessName,
        contactName: data.contactName ?? null,
        email: data.email,
        phone: data.phone ?? null,
        website: data.website ?? null,
        category: data.category,
        description: data.description ?? null,
        servicesOffered: data.servicesOffered ? JSON.stringify(data.servicesOffered) : null,
        priceRange: data.priceRange ?? null,
        locationCity: data.locationCity ?? null,
        locationState: data.locationState ?? null,
        locationCountry: data.locationCountry ?? null,
      })
      .returning();

    return c.json({ success: true, data: formatProvider(newProvider!) }, 201);
  }
);

/**
 * PATCH /providers/:uuid
 * Update provider (owner only)
 */
providers.patch(
  '/:uuid',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateProviderSchema),
  async (c) => {
    const user = c.get('user')!;
    const uuid = c.req.param('uuid')!;
    const updates = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    const [existing] = await db
      .select({ id: schema.serviceProviders.id, userId: schema.serviceProviders.userId })
      .from(schema.serviceProviders)
      .where(
        and(
          eq(schema.serviceProviders.uuid, uuid),
          isNull(schema.serviceProviders.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Provider not found' } },
        404
      );
    }

    if (existing.userId !== user.id) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not the owner of this provider' } },
        403
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.businessName !== undefined) updateData.businessName = updates.businessName;
    if (updates.contactName !== undefined) updateData.contactName = updates.contactName;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.website !== undefined) updateData.website = updates.website;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.servicesOffered !== undefined) {
      updateData.servicesOffered = updates.servicesOffered ? JSON.stringify(updates.servicesOffered) : null;
    }
    if (updates.priceRange !== undefined) updateData.priceRange = updates.priceRange;
    if (updates.locationCity !== undefined) updateData.locationCity = updates.locationCity;
    if (updates.locationState !== undefined) updateData.locationState = updates.locationState;
    if (updates.locationCountry !== undefined) updateData.locationCountry = updates.locationCountry;

    await db
      .update(schema.serviceProviders)
      .set(updateData)
      .where(eq(schema.serviceProviders.id, existing.id));

    const [fresh] = await db
      .select()
      .from(schema.serviceProviders)
      .where(eq(schema.serviceProviders.id, existing.id))
      .limit(1);

    return c.json({ success: true, data: formatProvider(fresh!) });
  }
);

/**
 * DELETE /providers/:uuid
 * Soft delete provider (owner only)
 */
providers.delete('/:uuid', requireAuth, requireVerifiedEmail, async (c) => {
  const user = c.get('user')!;
  const uuid = c.req.param('uuid')!;
  const db = createDbClient(c.env.DB);

  const [existing] = await db
    .select({ id: schema.serviceProviders.id, userId: schema.serviceProviders.userId })
    .from(schema.serviceProviders)
    .where(
      and(
        eq(schema.serviceProviders.uuid, uuid),
        isNull(schema.serviceProviders.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Provider not found' } },
      404
    );
  }

  if (existing.userId !== user.id) {
    return c.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Not the owner of this provider' } },
      403
    );
  }

  await db
    .update(schema.serviceProviders)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.serviceProviders.id, existing.id));

  return c.json({ success: true, data: { deleted: true } });
});

export default providers;
