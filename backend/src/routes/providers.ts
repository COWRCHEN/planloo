/**
 * Provider Routes
 *
 * CRUD endpoints for the global service provider directory.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, desc, asc, like, or, count, sql } from 'drizzle-orm';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';
import {
  createProviderSchema,
  updateProviderSchema,
  listProvidersQuerySchema,
  nearbyQuerySchema,
} from '../../../shared/schemas/provider';

const providers = new Hono<HonoEnv>();

// ==================== HELPERS ====================

function parseServicesOffered(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatProvider(p: typeof schema.serviceProviders.$inferSelect, currentUserId?: string) {
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
    locationAddress: p.locationAddress,
    locationCity: p.locationCity,
    locationState: p.locationState,
    locationCountry: p.locationCountry,
    locationPostalCode: p.locationPostalCode,
    ratingAverage: p.ratingAverage,
    ratingCount: p.ratingCount,
    isOwner: currentUserId ? p.userId === currentUserId : false,
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
    const user = c.get('user')!;
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
      data: items.map((p) => formatProvider(p, user.id)),
      meta: {
        total: countResult?.count ?? 0,
        limit,
        offset,
      },
    });
  }
);

/**
 * GET /providers/nearby
 * Find providers near a city or postal code prefix
 */
providers.get(
  '/nearby',
  requireAuth,
  zValidator('query', nearbyQuerySchema),
  async (c) => {
    const user = c.get('user')!;
    const { city, postalCode, country, category, limit } = c.req.valid('query');

    if (!city && !postalCode) {
      return c.json({
        success: true,
        data: [],
      });
    }

    const db = createDbClient(c.env.DB);

    const baseConditions = [
      eq(schema.serviceProviders.isActive, true),
      isNull(schema.serviceProviders.deletedAt),
    ];

    if (country) {
      baseConditions.push(eq(schema.serviceProviders.locationCountry, country));
    }
    if (category) {
      baseConditions.push(eq(schema.serviceProviders.category, category));
    }

    // Match by city (case-insensitive) OR postal code prefix (first 3 chars)
    const matchConditions = [];
    if (city) {
      matchConditions.push(
        sql`LOWER(${schema.serviceProviders.locationCity}) = LOWER(${city})`
      );
    }
    if (postalCode && postalCode.length >= 3) {
      const prefix = postalCode.substring(0, 3);
      matchConditions.push(
        sql`SUBSTR(${schema.serviceProviders.locationPostalCode}, 1, 3) = ${prefix}`
      );
    }

    if (matchConditions.length === 0) {
      return c.json({ success: true, data: [] });
    }

    const items = await db
      .select()
      .from(schema.serviceProviders)
      .where(and(...baseConditions, or(...matchConditions)))
      .orderBy(desc(schema.serviceProviders.ratingAverage))
      .limit(limit);

    return c.json({
      success: true,
      data: items.map((p) => formatProvider(p, user.id)),
    });
  }
);

/**
 * GET /providers/:uuid
 * Get provider detail
 */
providers.get('/:uuid', requireAuth, async (c) => {
  const user = c.get('user')!;
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

  return c.json({ success: true, data: formatProvider(provider, user.id) });
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
        locationAddress: data.locationAddress,
        locationCity: data.locationCity,
        locationState: data.locationState,
        locationCountry: data.locationCountry,
        locationPostalCode: data.locationPostalCode,
      })
      .returning();

    return c.json({ success: true, data: formatProvider(newProvider!, user.id) }, 201);
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
    if (updates.locationAddress !== undefined) updateData.locationAddress = updates.locationAddress;
    if (updates.locationCity !== undefined) updateData.locationCity = updates.locationCity;
    if (updates.locationState !== undefined) updateData.locationState = updates.locationState;
    if (updates.locationCountry !== undefined) updateData.locationCountry = updates.locationCountry;
    if (updates.locationPostalCode !== undefined) updateData.locationPostalCode = updates.locationPostalCode;

    await db
      .update(schema.serviceProviders)
      .set(updateData)
      .where(eq(schema.serviceProviders.id, existing.id));

    const [fresh] = await db
      .select()
      .from(schema.serviceProviders)
      .where(eq(schema.serviceProviders.id, existing.id))
      .limit(1);

    return c.json({ success: true, data: formatProvider(fresh!, user.id) });
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
