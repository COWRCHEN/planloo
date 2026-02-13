/**
 * Cloudflare Workers Environment Types
 *
 * Defines the bindings and environment variables available in Workers.
 */

import type { EventAccess } from '@/lib/event-access';

export interface Env {
  // Database binding
  DB: D1Database;

  // Better Auth secret (required)
  BETTER_AUTH_SECRET: string;

  // Environment
  ENVIRONMENT: 'development' | 'staging' | 'production';

  // Frontend URL for CORS and redirects
  FRONTEND_URL: string;

  // OAuth providers (optional)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;

  // Email service (optional)
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;

  // Rate limiting KV namespace (optional)
  RATE_LIMIT_KV?: KVNamespace;

  // R2 bucket for uploads (optional)
  UPLOADS_BUCKET?: R2Bucket;
  R2_PUBLIC_URL?: string;
}

/**
 * Type helper for Hono context with environment bindings
 */
export type HonoEnv = {
  Bindings: Env;
  Variables: {
    user?: {
      id: string;
      email: string;
      name: string | null;
      emailVerified: boolean;
      image: string | null;
      platformRole: 'super_admin' | 'operator' | 'user';
      isActive: boolean;
    };
    session?: {
      id: string;
      userId: string;
      expiresAt: Date;
    };
    eventAccess?: EventAccess;
  };
};
