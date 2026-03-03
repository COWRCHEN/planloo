/**
 * Organizations Routes
 *
 * CRUD endpoints for organization management, member management, invitations,
 * and event assignment. Admins can assign/unassign their own events to an org
 * so that org members gain access based on their role.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, desc, asc, sql, count } from 'drizzle-orm';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';
import { sendOrgInvitationEmail } from '@/lib/email';
import { checkOrganizationLimit, checkOrgMemberLimit } from '@/lib/billing-checks';

const organizations = new Hono<HonoEnv>();

// ==================== SCHEMAS ====================

const createOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  type: z.enum(['company', 'family']).default('company'),
  description: z.string().max(500).optional().nullable(),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(['company', 'family']).optional(),
  website: z.string().url().max(255).optional().nullable(),
  logoUrl: z.string().url().max(500).optional().nullable(),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

const listOrgEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['startDate', 'createdAt', 'title']).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ==================== HELPERS ====================

/**
 * Check if a user is a member of an org with an optional role requirement.
 * Returns { role } if access is granted, null otherwise.
 */
async function requireOrgRole(
  db: ReturnType<typeof createDbClient>,
  orgId: string,
  userId: string,
  requiredRoles?: ('admin' | 'member' | 'viewer')[]
): Promise<{ role: 'admin' | 'member' | 'viewer' } | null> {
  const [member] = await db
    .select({ role: schema.organizationMember.role })
    .from(schema.organizationMember)
    .where(
      and(
        eq(schema.organizationMember.organizationId, orgId),
        eq(schema.organizationMember.userId, userId)
      )
    )
    .limit(1);

  if (!member) return null;
  const role = member.role as 'admin' | 'member' | 'viewer';
  if (requiredRoles && !requiredRoles.includes(role)) return null;
  return { role };
}

// ==================== ROUTES ====================

/**
 * GET /organizations/check-slug
 * Check if a slug is available for an organization.
 * Optional orgId query param excludes the current org from the uniqueness check.
 *
 * IMPORTANT: Must be declared before /:orgId to avoid being caught by the param route.
 */
organizations.get('/check-slug', requireAuth, async (c) => {
  const slug = c.req.query('slug');
  const orgId = c.req.query('orgId');

  if (!slug) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'slug query parameter is required' },
      },
      400
    );
  }

  const db = createDbClient(c.env.DB);

  const conditions = [
    eq(schema.organization.slug, slug),
    isNull(schema.organization.deletedAt),
  ];

  // Exclude the current org if provided
  if (orgId) {
    conditions.push(sql`${schema.organization.id} != ${orgId}`);
  }

  const [existing] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(and(...conditions))
    .limit(1);

  return c.json({
    success: true,
    data: { available: !existing },
  });
});

/**
 * GET /organizations
 * List organizations the authenticated user is a member of.
 * Returns org details, the user's role, and total member count.
 */
organizations.get('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = createDbClient(c.env.DB);

  // Fetch all orgs where user is a member and org is not deleted
  const orgRows = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      type: schema.organization.type,
      description: schema.organization.description,
      logoUrl: schema.organization.logoUrl,
      website: schema.organization.website,
      createdBy: schema.organization.createdBy,
      createdAt: schema.organization.createdAt,
      updatedAt: schema.organization.updatedAt,
      // Caller's membership info
      memberRole: schema.organizationMember.role,
      memberAcceptedAt: schema.organizationMember.acceptedAt,
    })
    .from(schema.organization)
    .innerJoin(
      schema.organizationMember,
      and(
        eq(schema.organizationMember.organizationId, schema.organization.id),
        eq(schema.organizationMember.userId, user.id)
      )
    )
    .where(isNull(schema.organization.deletedAt))
    .orderBy(desc(schema.organization.createdAt));

  if (orgRows.length === 0) {
    return c.json({
      success: true,
      data: [],
    });
  }

  // Fetch member counts for each org in a single query
  const orgIds = orgRows.map((o) => o.id);
  const memberCounts = await db
    .select({
      organizationId: schema.organizationMember.organizationId,
      count: count(),
    })
    .from(schema.organizationMember)
    .where(
      sql`${schema.organizationMember.organizationId} IN (${sql.join(
        orgIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    )
    .groupBy(schema.organizationMember.organizationId);

  const countMap: Record<string, number> = {};
  for (const row of memberCounts) {
    countMap[row.organizationId] = row.count;
  }

  const data = orgRows.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    type: org.type,
    description: org.description,
    logoUrl: org.logoUrl,
    website: org.website,
    createdBy: org.createdBy,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    userRole: org.memberRole,
    acceptedAt: org.memberAcceptedAt,
    memberCount: countMap[org.id] ?? 0,
  }));

  return c.json({
    success: true,
    data,
  });
});

/**
 * POST /organizations
 * Create a new organization. Atomically inserts the org and adds the creator as admin.
 */
organizations.post('/', requireAuth, requireVerifiedEmail, zValidator('json', createOrgSchema), async (c) => {
  const user = c.get('user')!;
  const data = c.req.valid('json');
  const db = createDbClient(c.env.DB);

  // Enforce organization creation limit
  const orgCheck = await checkOrganizationLimit(db, user.id, c.get('planLimits')!);
  if (!orgCheck.ok) {
    return c.json({ success: false, error: orgCheck.error }, 402);
  }

  // Check slug uniqueness
  const [existingSlug] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.slug, data.slug),
        isNull(schema.organization.deletedAt)
      )
    )
    .limit(1);

  if (existingSlug) {
    return c.json(
      {
        success: false,
        error: { code: 'SLUG_TAKEN', message: 'This slug is already in use by another organization' },
      },
      409
    );
  }

  const orgId = crypto.randomUUID();
  const now = new Date();

  // Atomically create org + add creator as admin
  await db.batch([
    db.insert(schema.organization).values({
      id: orgId,
      name: data.name,
      slug: data.slug,
      type: data.type,
      description: data.description ?? null,
      createdBy: user.id,
    }),
    db.insert(schema.organizationMember).values({
      organizationId: orgId,
      userId: user.id,
      role: 'admin',
      acceptedAt: now,
    }),
  ]);

  // Fetch the created org to return
  const [newOrg] = await db
    .select()
    .from(schema.organization)
    .where(eq(schema.organization.id, orgId))
    .limit(1);

  return c.json(
    {
      success: true,
      data: { ...newOrg, userRole: 'admin', memberCount: 1 },
    },
    201
  );
});

/**
 * GET /organizations/:orgId
 * Get a single organization. User must be a member.
 */
organizations.get('/:orgId', requireAuth, async (c) => {
  const user = c.get('user')!;
  const orgId = c.req.param('orgId');
  const db = createDbClient(c.env.DB);

  // Verify membership
  const membership = await requireOrgRole(db, orgId, user.id);
  if (!membership) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      },
      404
    );
  }

  const [org] = await db
    .select()
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.id, orgId),
        isNull(schema.organization.deletedAt)
      )
    )
    .limit(1);

  if (!org) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      },
      404
    );
  }

  const [countResult] = await db
    .select({ count: count() })
    .from(schema.organizationMember)
    .where(eq(schema.organizationMember.organizationId, orgId));

  return c.json({
    success: true,
    data: {
      ...org,
      userRole: membership.role,
      memberCount: countResult?.count ?? 0,
    },
  });
});

/**
 * PATCH /organizations/:orgId
 * Update organization details. Admin only.
 */
organizations.patch(
  '/:orgId',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', updateOrgSchema),
  async (c) => {
    const user = c.get('user')!;
    const orgId = c.req.param('orgId');
    const updates = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    // Admin only
    const membership = await requireOrgRole(db, orgId, user.id, ['admin']);
    if (!membership) {
      return c.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        },
        403
      );
    }

    // Verify org exists and is not deleted
    const [org] = await db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(
        and(
          eq(schema.organization.id, orgId),
          isNull(schema.organization.deletedAt)
        )
      )
      .limit(1);

    if (!org) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        },
        404
      );
    }

    // Build partial update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.website !== undefined) updateData.website = updates.website;
    if (updates.logoUrl !== undefined) updateData.logoUrl = updates.logoUrl;

    const [updatedOrg] = await db
      .update(schema.organization)
      .set(updateData)
      .where(eq(schema.organization.id, orgId))
      .returning();

    return c.json({
      success: true,
      data: updatedOrg,
    });
  }
);

/**
 * DELETE /organizations/:orgId
 * Soft delete an organization. Admin only, and caller must be the original creator.
 */
organizations.delete('/:orgId', requireAuth, async (c) => {
  const user = c.get('user')!;
  const orgId = c.req.param('orgId');
  const db = createDbClient(c.env.DB);

  // Admin only
  const membership = await requireOrgRole(db, orgId, user.id, ['admin']);
  if (!membership) {
    return c.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      },
      403
    );
  }

  const [org] = await db
    .select({ id: schema.organization.id, createdBy: schema.organization.createdBy })
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.id, orgId),
        isNull(schema.organization.deletedAt)
      )
    )
    .limit(1);

  if (!org) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      },
      404
    );
  }

  // Only the original creator may delete the organization
  if (org.createdBy !== user.id) {
    return c.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only the organization creator can delete this organization',
        },
      },
      403
    );
  }

  await db
    .update(schema.organization)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.organization.id, orgId));

  return c.json({
    success: true,
    data: { deleted: true },
  });
});

/**
 * GET /organizations/:orgId/members
 * List all members of an organization. Any member can view.
 */
organizations.get('/:orgId/members', requireAuth, async (c) => {
  const user = c.get('user')!;
  const orgId = c.req.param('orgId');
  const db = createDbClient(c.env.DB);

  // Any member may view
  const membership = await requireOrgRole(db, orgId, user.id);
  if (!membership) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      },
      404
    );
  }

  // Verify org is not deleted
  const [org] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.id, orgId),
        isNull(schema.organization.deletedAt)
      )
    )
    .limit(1);

  if (!org) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      },
      404
    );
  }

  const members = await db
    .select({
      id: schema.organizationMember.id,
      userId: schema.organizationMember.userId,
      role: schema.organizationMember.role,
      invitedBy: schema.organizationMember.invitedBy,
      invitedAt: schema.organizationMember.invitedAt,
      acceptedAt: schema.organizationMember.acceptedAt,
      createdAt: schema.organizationMember.createdAt,
      updatedAt: schema.organizationMember.updatedAt,
      userName: schema.user.name,
      userEmail: schema.user.email,
      userImage: schema.user.image,
    })
    .from(schema.organizationMember)
    .innerJoin(schema.user, eq(schema.user.id, schema.organizationMember.userId))
    .where(eq(schema.organizationMember.organizationId, orgId))
    .orderBy(asc(schema.organizationMember.createdAt));

  return c.json({
    success: true,
    data: members,
  });
});

/**
 * PATCH /organizations/:orgId/members/:memberId
 * Update a member's role. Admin only. Cannot change own role or the org creator's role.
 */
organizations.patch(
  '/:orgId/members/:memberId',
  requireAuth,
  zValidator('json', updateMemberRoleSchema),
  async (c) => {
    const user = c.get('user')!;
    const orgId = c.req.param('orgId');
    const memberId = Number(c.req.param('memberId'));
    const { role } = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    if (isNaN(memberId)) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid memberId' },
        },
        400
      );
    }

    // Admin only
    const callerMembership = await requireOrgRole(db, orgId, user.id, ['admin']);
    if (!callerMembership) {
      return c.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        },
        403
      );
    }

    // Verify org is not deleted
    const [org] = await db
      .select({ id: schema.organization.id, createdBy: schema.organization.createdBy })
      .from(schema.organization)
      .where(
        and(
          eq(schema.organization.id, orgId),
          isNull(schema.organization.deletedAt)
        )
      )
      .limit(1);

    if (!org) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        },
        404
      );
    }

    // Fetch the target member record
    const [targetMember] = await db
      .select({
        id: schema.organizationMember.id,
        userId: schema.organizationMember.userId,
        role: schema.organizationMember.role,
      })
      .from(schema.organizationMember)
      .where(
        and(
          eq(schema.organizationMember.id, memberId),
          eq(schema.organizationMember.organizationId, orgId)
        )
      )
      .limit(1);

    if (!targetMember) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Member not found' },
        },
        404
      );
    }

    // Cannot change own role
    if (targetMember.userId === user.id) {
      return c.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You cannot change your own role' },
        },
        403
      );
    }

    // Cannot change the org creator's role
    if (targetMember.userId === org.createdBy) {
      return c.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: "You cannot change the organization creator's role" },
        },
        403
      );
    }

    const [updatedMember] = await db
      .update(schema.organizationMember)
      .set({ role, updatedAt: new Date() })
      .where(eq(schema.organizationMember.id, memberId))
      .returning();

    return c.json({
      success: true,
      data: updatedMember,
    });
  }
);

/**
 * DELETE /organizations/:orgId/members/:memberId
 * Remove a member from an organization.
 * - Admin can remove any non-creator member.
 * - Any member can remove themselves (self-leave).
 * - The org creator cannot be removed.
 */
organizations.delete('/:orgId/members/:memberId', requireAuth, async (c) => {
  const user = c.get('user')!;
  const orgId = c.req.param('orgId');
  const memberId = Number(c.req.param('memberId'));
  const db = createDbClient(c.env.DB);

  if (isNaN(memberId)) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid memberId' },
      },
      400
    );
  }

  // Verify org exists and is not deleted
  const [org] = await db
    .select({ id: schema.organization.id, createdBy: schema.organization.createdBy })
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.id, orgId),
        isNull(schema.organization.deletedAt)
      )
    )
    .limit(1);

  if (!org) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      },
      404
    );
  }

  // Fetch the target member record
  const [targetMember] = await db
    .select({
      id: schema.organizationMember.id,
      userId: schema.organizationMember.userId,
    })
    .from(schema.organizationMember)
    .where(
      and(
        eq(schema.organizationMember.id, memberId),
        eq(schema.organizationMember.organizationId, orgId)
      )
    )
    .limit(1);

  if (!targetMember) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Member not found' },
      },
      404
    );
  }

  // Cannot remove the org creator
  if (targetMember.userId === org.createdBy) {
    return c.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'The organization creator cannot be removed from the organization',
        },
      },
      403
    );
  }

  const isSelf = targetMember.userId === user.id;

  if (!isSelf) {
    // Non-self removal requires admin
    const callerMembership = await requireOrgRole(db, orgId, user.id, ['admin']);
    if (!callerMembership) {
      return c.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required to remove other members' },
        },
        403
      );
    }
  } else {
    // Self-leave: verify the caller is actually a member
    const membership = await requireOrgRole(db, orgId, user.id);
    if (!membership) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        },
        404
      );
    }
  }

  await db
    .delete(schema.organizationMember)
    .where(eq(schema.organizationMember.id, memberId));

  return c.json({
    success: true,
    data: { removed: true },
  });
});

/**
 * GET /organizations/:orgId/events
 * List events belonging to an organization. Any member can view.
 * Supports pagination and sorting.
 */
organizations.get(
  '/:orgId/events',
  requireAuth,
  zValidator('query', listOrgEventsQuerySchema),
  async (c) => {
    const user = c.get('user')!;
    const orgId = c.req.param('orgId');
    const { limit, offset, sortBy, sortOrder } = c.req.valid('query');
    const db = createDbClient(c.env.DB);

    // Any member may view
    const membership = await requireOrgRole(db, orgId, user.id);
    if (!membership) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        },
        404
      );
    }

    // Verify org is not deleted
    const [org] = await db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(
        and(
          eq(schema.organization.id, orgId),
          isNull(schema.organization.deletedAt)
        )
      )
      .limit(1);

    if (!org) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        },
        404
      );
    }

    const conditions = [
      eq(schema.events.organizationId, orgId),
      isNull(schema.events.deletedAt),
    ];

    const sortColumn =
      sortBy === 'startDate'
        ? schema.events.startDate
        : sortBy === 'title'
          ? schema.events.title
          : schema.events.createdAt;

    const orderFn = sortOrder === 'desc' ? desc : asc;

    const [countResult] = await db
      .select({ count: count() })
      .from(schema.events)
      .where(and(...conditions));

    const eventsList = await db
      .select({
        id: schema.events.id,
        uuid: schema.events.uuid,
        userId: schema.events.userId,
        organizationId: schema.events.organizationId,
        title: schema.events.title,
        description: schema.events.description,
        eventType: schema.events.eventType,
        status: schema.events.status,
        startDate: schema.events.startDate,
        endDate: schema.events.endDate,
        timezone: schema.events.timezone,
        locationName: schema.events.locationName,
        locationCity: schema.events.locationCity,
        locationCountry: schema.events.locationCountry,
        guestCountExpected: schema.events.guestCountExpected,
        guestCountConfirmed: schema.events.guestCountConfirmed,
        budgetTotal: schema.events.budgetTotal,
        budgetCurrency: schema.events.budgetCurrency,
        isPublic: schema.events.isPublic,
        coverImageUrl: schema.events.coverImageUrl,
        createdAt: schema.events.createdAt,
        updatedAt: schema.events.updatedAt,
      })
      .from(schema.events)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    return c.json({
      success: true,
      data: eventsList,
      meta: {
        total: countResult?.count ?? 0,
        limit,
        offset,
      },
    });
  }
);

/**
 * PUT /organizations/:orgId/events/:eventUuid
 * Assign an event to an organization. Admin only.
 * The caller must be the event owner (event.userId === user.id).
 * Rejects if the event is already assigned to another org.
 */
organizations.put('/:orgId/events/:eventUuid', requireAuth, async (c) => {
  const user = c.get('user')!;
  const orgId = c.req.param('orgId');
  const eventUuid = c.req.param('eventUuid');
  const db = createDbClient(c.env.DB);

  // Admin only
  const membership = await requireOrgRole(db, orgId, user.id, ['admin']);
  if (!membership) {
    return c.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      },
      403
    );
  }

  // Verify org is not deleted
  const [org] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.id, orgId),
        isNull(schema.organization.deletedAt)
      )
    )
    .limit(1);

  if (!org) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      },
      404
    );
  }

  // Fetch the event
  const [event] = await db
    .select({
      id: schema.events.id,
      uuid: schema.events.uuid,
      userId: schema.events.userId,
      organizationId: schema.events.organizationId,
    })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.uuid, eventUuid),
        isNull(schema.events.deletedAt)
      )
    )
    .limit(1);

  if (!event) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event not found' },
      },
      404
    );
  }

  // Only the event owner can assign it
  if (event.userId !== user.id) {
    return c.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only the event owner can assign it to an organization' },
      },
      403
    );
  }

  // Reject if already assigned to another org
  if (event.organizationId && event.organizationId !== orgId) {
    return c.json(
      {
        success: false,
        error: {
          code: 'ALREADY_ASSIGNED',
          message: 'Event is already assigned to another organization. Unassign it first.',
        },
      },
      409
    );
  }

  // Already assigned to this org — idempotent success
  if (event.organizationId === orgId) {
    return c.json({
      success: true,
      data: { assigned: true, eventUuid, organizationId: orgId },
    });
  }

  // Assign
  await db
    .update(schema.events)
    .set({ organizationId: orgId, updatedAt: new Date() })
    .where(eq(schema.events.id, event.id));

  return c.json({
    success: true,
    data: { assigned: true, eventUuid, organizationId: orgId },
  });
});

/**
 * DELETE /organizations/:orgId/events/:eventUuid
 * Unassign an event from an organization. Admin only.
 * Clears event.organizationId to null.
 */
organizations.delete('/:orgId/events/:eventUuid', requireAuth, async (c) => {
  const user = c.get('user')!;
  const orgId = c.req.param('orgId');
  const eventUuid = c.req.param('eventUuid');
  const db = createDbClient(c.env.DB);

  // Admin only
  const membership = await requireOrgRole(db, orgId, user.id, ['admin']);
  if (!membership) {
    return c.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      },
      403
    );
  }

  // Verify org is not deleted
  const [org] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.id, orgId),
        isNull(schema.organization.deletedAt)
      )
    )
    .limit(1);

  if (!org) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      },
      404
    );
  }

  // Fetch the event
  const [event] = await db
    .select({
      id: schema.events.id,
      organizationId: schema.events.organizationId,
    })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.uuid, eventUuid),
        isNull(schema.events.deletedAt)
      )
    )
    .limit(1);

  if (!event) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event not found' },
      },
      404
    );
  }

  // Event must be assigned to this org
  if (event.organizationId !== orgId) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event is not assigned to this organization' },
      },
      404
    );
  }

  // Unassign
  await db
    .update(schema.events)
    .set({ organizationId: null, updatedAt: new Date() })
    .where(eq(schema.events.id, event.id));

  return c.json({
    success: true,
    data: { unassigned: true, eventUuid },
  });
});

/**
 * POST /organizations/:orgId/invitations
 * Create a pending invitation for a user by email. Admin only.
 * Checks that no pending invitation exists and the user isn't already a member.
 */
organizations.post(
  '/:orgId/invitations',
  requireAuth,
  requireVerifiedEmail,
  zValidator('json', inviteMemberSchema),
  async (c) => {
    const user = c.get('user')!;
    const orgId = c.req.param('orgId');
    const { email, role } = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    // Admin only
    const membership = await requireOrgRole(db, orgId, user.id, ['admin']);
    if (!membership) {
      return c.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        },
        403
      );
    }

    // Enforce org member limit
    const memberCheck = await checkOrgMemberLimit(db, orgId, c.get('planLimits')!);
    if (!memberCheck.ok) {
      return c.json({ success: false, error: memberCheck.error }, 402);
    }

    // Verify org is not deleted
    const [org] = await db
      .select({ id: schema.organization.id, name: schema.organization.name })
      .from(schema.organization)
      .where(
        and(
          eq(schema.organization.id, orgId),
          isNull(schema.organization.deletedAt)
        )
      )
      .limit(1);

    if (!org) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        },
        404
      );
    }

    // Check if user with this email is already a member
    const [existingUser] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);

    if (existingUser) {
      const [alreadyMember] = await db
        .select({ id: schema.organizationMember.id })
        .from(schema.organizationMember)
        .where(
          and(
            eq(schema.organizationMember.organizationId, orgId),
            eq(schema.organizationMember.userId, existingUser.id)
          )
        )
        .limit(1);

      if (alreadyMember) {
        return c.json(
          {
            success: false,
            error: { code: 'ALREADY_MEMBER', message: 'This user is already a member of the organization' },
          },
          409
        );
      }
    }

    // Check for an existing pending (non-expired, non-accepted) invitation
    const now = new Date();
    const nowUnix = Math.floor(now.getTime() / 1000);

    const [existingInvitation] = await db
      .select({ id: schema.organizationInvitation.id })
      .from(schema.organizationInvitation)
      .where(
        and(
          eq(schema.organizationInvitation.organizationId, orgId),
          eq(schema.organizationInvitation.email, email),
          isNull(schema.organizationInvitation.acceptedAt),
          sql`${schema.organizationInvitation.expiresAt} > ${nowUnix}`
        )
      )
      .limit(1);

    if (existingInvitation) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVITATION_EXISTS',
            message: 'A pending invitation already exists for this email address',
          },
        },
        409
      );
    }

    // Create invitation — expires in 7 days
    const invitationId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [newInvitation] = await db
      .insert(schema.organizationInvitation)
      .values({
        id: invitationId,
        organizationId: orgId,
        email,
        role,
        invitedBy: user.id,
        token,
        expiresAt,
      })
      .returning();

    // Send invitation email (fire-and-forget — don't block the response)
    const acceptUrl = `${c.env.FRONTEND_URL}/invitations/${token}`;
    c.executionCtx.waitUntil(
      sendOrgInvitationEmail(c.env, {
        to: email,
        inviterName: user.name,
        organizationName: org.name,
        role,
        acceptUrl,
        expiresAt,
      }).catch((err) => {
        console.error('Failed to send org invitation email:', err);
      })
    );

    return c.json(
      {
        success: true,
        data: newInvitation,
      },
      201
    );
  }
);

/**
 * GET /organizations/:orgId/invitations
 * List pending (non-expired, non-accepted) invitations. Admin only.
 * Joins with the user table to include the inviter's name.
 */
organizations.get('/:orgId/invitations', requireAuth, async (c) => {
  const user = c.get('user')!;
  const orgId = c.req.param('orgId');
  const db = createDbClient(c.env.DB);

  // Admin only
  const membership = await requireOrgRole(db, orgId, user.id, ['admin']);
  if (!membership) {
    return c.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      },
      403
    );
  }

  // Verify org is not deleted
  const [org] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.id, orgId),
        isNull(schema.organization.deletedAt)
      )
    )
    .limit(1);

  if (!org) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      },
      404
    );
  }

  const nowUnix = Math.floor(Date.now() / 1000);

  const invitations = await db
    .select({
      id: schema.organizationInvitation.id,
      organizationId: schema.organizationInvitation.organizationId,
      email: schema.organizationInvitation.email,
      role: schema.organizationInvitation.role,
      invitedBy: schema.organizationInvitation.invitedBy,
      expiresAt: schema.organizationInvitation.expiresAt,
      createdAt: schema.organizationInvitation.createdAt,
      inviterName: schema.user.name,
    })
    .from(schema.organizationInvitation)
    .innerJoin(schema.user, eq(schema.user.id, schema.organizationInvitation.invitedBy))
    .where(
      and(
        eq(schema.organizationInvitation.organizationId, orgId),
        isNull(schema.organizationInvitation.acceptedAt),
        sql`${schema.organizationInvitation.expiresAt} > ${nowUnix}`
      )
    )
    .orderBy(desc(schema.organizationInvitation.createdAt));

  return c.json({
    success: true,
    data: invitations,
  });
});

/**
 * DELETE /organizations/:orgId/invitations/:invitationId
 * Revoke (hard delete) an invitation. Admin only.
 */
organizations.delete('/:orgId/invitations/:invitationId', requireAuth, async (c) => {
  const user = c.get('user')!;
  const orgId = c.req.param('orgId');
  const invitationId = c.req.param('invitationId');
  const db = createDbClient(c.env.DB);

  // Admin only
  const membership = await requireOrgRole(db, orgId, user.id, ['admin']);
  if (!membership) {
    return c.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      },
      403
    );
  }

  // Verify org is not deleted
  const [org] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.id, orgId),
        isNull(schema.organization.deletedAt)
      )
    )
    .limit(1);

  if (!org) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      },
      404
    );
  }

  // Find the invitation
  const [invitation] = await db
    .select({ id: schema.organizationInvitation.id })
    .from(schema.organizationInvitation)
    .where(
      and(
        eq(schema.organizationInvitation.id, invitationId),
        eq(schema.organizationInvitation.organizationId, orgId)
      )
    )
    .limit(1);

  if (!invitation) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invitation not found' },
      },
      404
    );
  }

  await db
    .delete(schema.organizationInvitation)
    .where(eq(schema.organizationInvitation.id, invitationId));

  return c.json({
    success: true,
    data: { revoked: true },
  });
});

export default organizations;
