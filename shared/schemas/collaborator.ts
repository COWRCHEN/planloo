/**
 * Collaborator Schemas
 *
 * Shared Zod schemas for event collaborator operations.
 */

import { z } from 'zod';

// ==================== ENUMS ====================

export const COLLABORATOR_ROLES = ['owner', 'editor', 'viewer'] as const;

export type CollaboratorRole = (typeof COLLABORATOR_ROLES)[number];

// ==================== SCHEMAS ====================

export const inviteCollaboratorSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(COLLABORATOR_ROLES).default('editor'),
});

export const updateCollaboratorRoleSchema = z.object({
  role: z.enum(COLLABORATOR_ROLES),
});

// ==================== RESPONSE TYPES ====================

export interface CollaboratorResponse {
  id: number;
  userId: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  role: CollaboratorRole;
  invitedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}
