/**
 * Event Access Resolution
 *
 * Unified access control for events. Replaces per-route getEventByUuidForUser helpers.
 */

import type { DbClient } from '@/db/client';
import { schema } from '@/db';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';

export type AccessType =
  | 'owner'
  | 'org_admin'
  | 'org_member'
  | 'org_viewer'
  | 'collaborator_owner'
  | 'collaborator_editor'
  | 'collaborator_viewer';

export interface EventAccess {
  event: {
    id: number;
    uuid: string;
    userId: string;
    organizationId: string | null;
    eventType: string | null;
  };
  accessType: AccessType;
  canEdit: boolean;
  canDelete: boolean;
  canManageGuests: boolean;
  canManageCollaborators: boolean;
  canManageBudget: boolean;
  orgRole?: 'admin' | 'member' | 'viewer';
  collaboratorRole?: 'owner' | 'editor' | 'viewer';
}

/**
 * Resolve access to an event for a given user.
 *
 * Resolution order:
 * 1. Direct ownership (event.userId === userId) → 'owner'
 * 2. Organization membership (if event is assigned to an org) → org_admin/org_member/org_viewer
 * 3. Event collaborator (if acceptedAt is not null) → collaborator_owner/collaborator_editor/collaborator_viewer
 * 4. No access → null
 */
export async function resolveEventAccess(
  db: DbClient,
  eventUuid: string,
  userId: string
): Promise<EventAccess | null> {
  // 1. Fetch event
  const [event] = await db
    .select({
      id: schema.events.id,
      uuid: schema.events.uuid,
      userId: schema.events.userId,
      organizationId: schema.events.organizationId,
      eventType: schema.events.eventType,
    })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.uuid, eventUuid),
        isNull(schema.events.deletedAt)
      )
    )
    .limit(1);

  if (!event) return null;

  const eventData = {
    id: event.id,
    uuid: event.uuid,
    userId: event.userId,
    organizationId: event.organizationId,
    eventType: event.eventType,
  };

  // 2. Check direct ownership (userId is always set)
  if (event.userId === userId) {
    return {
      event: eventData,
      accessType: 'owner',
      canEdit: true,
      canDelete: true,
      canManageGuests: true,
      canManageCollaborators: true,
      canManageBudget: true,
    };
  }

  // 3. Check org membership
  if (event.organizationId) {
    const [member] = await db
      .select({
        role: schema.organizationMember.role,
      })
      .from(schema.organizationMember)
      .where(
        and(
          eq(schema.organizationMember.organizationId, event.organizationId),
          eq(schema.organizationMember.userId, userId)
        )
      )
      .limit(1);

    if (member) {
      const role = member.role as 'admin' | 'member' | 'viewer';

      if (role === 'admin') {
        return {
          event: eventData,
          accessType: 'org_admin',
          canEdit: true,
          canDelete: true,
          canManageGuests: true,
          canManageCollaborators: true,
          canManageBudget: true,
          orgRole: 'admin',
        };
      }

      if (role === 'member') {
        return {
          event: eventData,
          accessType: 'org_member',
          canEdit: true,
          canDelete: false,
          canManageGuests: true,
          canManageCollaborators: false,
          canManageBudget: true,
          orgRole: 'member',
        };
      }

      // viewer
      return {
        event: eventData,
        accessType: 'org_viewer',
        canEdit: false,
        canDelete: false,
        canManageGuests: false,
        canManageCollaborators: false,
        canManageBudget: false,
        orgRole: 'viewer',
      };
    }
  }

  // 4. Check collaborator access
  const [collaborator] = await db
    .select({
      role: schema.eventCollaborators.role,
    })
    .from(schema.eventCollaborators)
    .where(
      and(
        eq(schema.eventCollaborators.eventId, event.id),
        eq(schema.eventCollaborators.userId, userId),
        isNotNull(schema.eventCollaborators.acceptedAt)
      )
    )
    .limit(1);

  if (collaborator) {
    const role = collaborator.role as 'owner' | 'editor' | 'viewer';

    if (role === 'owner') {
      return {
        event: eventData,
        accessType: 'collaborator_owner',
        canEdit: true,
        canDelete: false,
        canManageGuests: true,
        canManageCollaborators: true,
        canManageBudget: true,
        collaboratorRole: 'owner',
      };
    }

    if (role === 'editor') {
      return {
        event: eventData,
        accessType: 'collaborator_editor',
        canEdit: true,
        canDelete: false,
        canManageGuests: true,
        canManageCollaborators: false,
        canManageBudget: true,
        collaboratorRole: 'editor',
      };
    }

    // viewer
    return {
      event: eventData,
      accessType: 'collaborator_viewer',
      canEdit: false,
      canDelete: false,
      canManageGuests: false,
      canManageCollaborators: false,
      canManageBudget: false,
      collaboratorRole: 'viewer',
    };
  }

  // 5. No access
  return null;
}
