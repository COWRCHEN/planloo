/**
 * Audit Log Helper
 *
 * Utility for creating audit log entries from admin operations.
 */

import type { DbClient } from '@/db/client';
import { schema } from '@/db';

interface AuditLogParams {
  db: DbClient;
  actorId: string;
  actorRole: 'super_admin' | 'operator';
  action: string;
  targetType?: string | undefined;
  targetId?: string | undefined;
  targetName?: string | undefined;
  details?: Record<string, unknown> | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export async function createAuditLogEntry(params: AuditLogParams) {
  const { db, actorId, actorRole, action, targetType, targetId, targetName, details, ipAddress, userAgent } = params;

  await db.insert(schema.auditLog).values({
    actorId,
    actorRole,
    action,
    targetType: targetType ?? null,
    targetId: targetId ?? null,
    targetName: targetName ?? null,
    details: details ? JSON.stringify(details) : null,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
}
