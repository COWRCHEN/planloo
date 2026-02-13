/**
 * Organization Schemas
 *
 * Shared Zod schemas for organization operations.
 */

import { z } from 'zod';

// ==================== ENUMS ====================

export const ORG_TYPES = ['company', 'family'] as const;
export const ORG_ROLES = ['admin', 'member', 'viewer'] as const;

export type OrgType = (typeof ORG_TYPES)[number];
export type OrgRole = (typeof ORG_ROLES)[number];

// ==================== SCHEMAS ====================

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  type: z.enum(ORG_TYPES).default('company'),
  description: z.string().max(500).optional().nullable(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(ORG_TYPES).optional(),
  website: z.string().url().max(255).optional().nullable(),
  logoUrl: z.string().url().max(500).optional().nullable(),
});

export const createOrgInvitationSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(ORG_ROLES).default('member'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(ORG_ROLES),
});

// ==================== RESPONSE TYPES ====================

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMemberResponse {
  id: number;
  userId: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  role: OrgRole;
  createdAt: string;
}

export interface OrgInvitationResponse {
  id: string;
  email: string;
  role: OrgRole;
  invitedByName: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface UserOrgSummary {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
}
