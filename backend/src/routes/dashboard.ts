/**
 * Dashboard Routes
 *
 * Cross-event aggregation endpoints for the dashboard:
 * - Recent activity feed (aggregated from events, tasks, guests)
 * - Upcoming tasks/deadlines across all accessible events
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { HonoEnv } from '@/types/env';
import { requireAuth } from '@/middleware/auth';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, sql, ne, isNotNull, desc, asc } from 'drizzle-orm';

const dashboard = new Hono<HonoEnv>();

dashboard.use('*', requireAuth);

const limitSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * Returns a SQL fragment selecting all event IDs accessible by the current user:
 * personal events + org membership + accepted collaborator invites.
 */
function accessibleEventIds(userId: string) {
  return sql`(
    SELECT ${schema.events.id} FROM ${schema.events}
    WHERE ${schema.events.deletedAt} IS NULL
    AND (
      ${schema.events.userId} = ${userId}
      OR ${schema.events.organizationId} IN (
        SELECT ${schema.organizationMember.organizationId}
        FROM ${schema.organizationMember}
        WHERE ${schema.organizationMember.userId} = ${userId}
      )
      OR ${schema.events.id} IN (
        SELECT ${schema.eventCollaborators.eventId}
        FROM ${schema.eventCollaborators}
        WHERE ${schema.eventCollaborators.userId} = ${userId}
        AND ${schema.eventCollaborators.acceptedAt} IS NOT NULL
      )
    )
  )`;
}

// ==================== ACTIVITY FEED ====================

interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
  eventUuid: string;
  eventTitle: string;
  entityUuid?: string;
}

/**
 * GET /api/v1/dashboard/activity?limit=10
 *
 * Aggregates recent records across the user's events into a unified feed.
 */
dashboard.get(
  '/activity',
  zValidator('query', limitSchema),
  async (c) => {
    const user = c.get('user')!;
    const { limit } = c.req.valid('query');
    const db = createDbClient(c.env.DB);
    const evtFilter = accessibleEventIds(user.id);

    const fetchLimit = limit * 2;

    const [recentEvents, recentTasks, recentGuests] = await Promise.all([
      db
        .select({
          uuid: schema.events.uuid,
          title: schema.events.title,
          createdAt: schema.events.createdAt,
          updatedAt: schema.events.updatedAt,
        })
        .from(schema.events)
        .where(
          and(
            sql`${schema.events.id} IN ${evtFilter}`,
            isNull(schema.events.deletedAt)
          )
        )
        .orderBy(desc(schema.events.updatedAt))
        .limit(fetchLimit),

      db
        .select({
          uuid: schema.tasks.uuid,
          title: schema.tasks.title,
          status: schema.tasks.status,
          createdAt: schema.tasks.createdAt,
          completedAt: schema.tasks.completedAt,
          eventUuid: schema.events.uuid,
          eventTitle: schema.events.title,
        })
        .from(schema.tasks)
        .innerJoin(schema.events, eq(schema.tasks.eventId, schema.events.id))
        .where(
          and(
            sql`${schema.tasks.eventId} IN ${evtFilter}`,
            isNull(schema.tasks.deletedAt)
          )
        )
        .orderBy(desc(schema.tasks.createdAt))
        .limit(fetchLimit),

      db
        .select({
          uuid: schema.guests.uuid,
          firstName: schema.guests.firstName,
          lastName: schema.guests.lastName,
          createdAt: schema.guests.createdAt,
          eventUuid: schema.events.uuid,
          eventTitle: schema.events.title,
        })
        .from(schema.guests)
        .innerJoin(schema.events, eq(schema.guests.eventId, schema.events.id))
        .where(
          and(
            sql`${schema.guests.eventId} IN ${evtFilter}`,
            isNull(schema.guests.deletedAt)
          )
        )
        .orderBy(desc(schema.guests.createdAt))
        .limit(fetchLimit),
    ]);

    const activities: ActivityItem[] = [];

    for (const evt of recentEvents) {
      const created = evt.createdAt instanceof Date ? evt.createdAt : new Date(evt.createdAt as unknown as number * 1000);
      const updated = evt.updatedAt instanceof Date ? evt.updatedAt : new Date(evt.updatedAt as unknown as number * 1000);
      const isNew = Math.abs(updated.getTime() - created.getTime()) < 5000;

      if (isNew) {
        activities.push({
          type: 'event_created',
          description: `Created event '${evt.title}'`,
          timestamp: created.toISOString(),
          eventUuid: evt.uuid,
          eventTitle: evt.title,
        });
      } else {
        activities.push({
          type: 'event_updated',
          description: `Updated event '${evt.title}'`,
          timestamp: updated.toISOString(),
          eventUuid: evt.uuid,
          eventTitle: evt.title,
        });
      }
    }

    for (const task of recentTasks) {
      const created = task.createdAt instanceof Date ? task.createdAt : new Date(task.createdAt as unknown as number * 1000);

      if (task.status === 'completed' && task.completedAt) {
        const completedAt = task.completedAt instanceof Date ? task.completedAt : new Date(task.completedAt as unknown as number * 1000);
        activities.push({
          type: 'task_completed',
          description: `Completed task '${task.title}'`,
          timestamp: completedAt.toISOString(),
          eventUuid: task.eventUuid,
          eventTitle: task.eventTitle,
          entityUuid: task.uuid,
        });
      }

      activities.push({
        type: 'task_created',
        description: `Added task '${task.title}'`,
        timestamp: created.toISOString(),
        eventUuid: task.eventUuid,
        eventTitle: task.eventTitle,
        entityUuid: task.uuid,
      });
    }

    for (const guest of recentGuests) {
      const created = guest.createdAt instanceof Date ? guest.createdAt : new Date(guest.createdAt as unknown as number * 1000);
      const name = [guest.firstName, guest.lastName].filter(Boolean).join(' ');
      activities.push({
        type: 'guest_added',
        description: `Added guest '${name}'`,
        timestamp: created.toISOString(),
        eventUuid: guest.eventUuid,
        eventTitle: guest.eventTitle,
        entityUuid: guest.uuid,
      });
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({
      success: true,
      data: activities.slice(0, limit),
    });
  }
);

// ==================== UPCOMING TASKS ====================

/**
 * GET /api/v1/dashboard/upcoming-tasks?limit=10
 *
 * Returns incomplete tasks with due dates across all accessible events,
 * sorted by dueDate ASC. Includes overdue tasks.
 */
dashboard.get(
  '/upcoming-tasks',
  zValidator('query', limitSchema),
  async (c) => {
    const user = c.get('user')!;
    const { limit } = c.req.valid('query');
    const db = createDbClient(c.env.DB);
    const evtFilter = accessibleEventIds(user.id);

    const rows = await db
      .select({
        uuid: schema.tasks.uuid,
        title: schema.tasks.title,
        dueDate: schema.tasks.dueDate,
        priority: schema.tasks.priority,
        status: schema.tasks.status,
        eventUuid: schema.events.uuid,
        eventTitle: schema.events.title,
      })
      .from(schema.tasks)
      .innerJoin(schema.events, eq(schema.tasks.eventId, schema.events.id))
      .where(
        and(
          sql`${schema.tasks.eventId} IN ${evtFilter}`,
          isNull(schema.tasks.deletedAt),
          ne(schema.tasks.status, 'completed'),
          isNotNull(schema.tasks.dueDate)
        )
      )
      .orderBy(asc(schema.tasks.dueDate))
      .limit(limit);

    const now = new Date();

    const data = rows.map((row) => {
      const dueDate = row.dueDate instanceof Date ? row.dueDate : new Date(row.dueDate as unknown as number * 1000);
      return {
        uuid: row.uuid,
        title: row.title,
        dueDate: dueDate.toISOString(),
        priority: row.priority,
        status: row.status,
        eventUuid: row.eventUuid,
        eventTitle: row.eventTitle,
        isOverdue: dueDate < now,
      };
    });

    return c.json({
      success: true,
      data,
    });
  }
);

export default dashboard;
