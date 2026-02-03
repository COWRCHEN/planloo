/**
 * Authentication Middleware
 *
 * Provides middleware functions for route protection and authorization.
 */

import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '@/types/env';
import { createAuth } from '@/lib/auth';
import type { PlatformRole } from '@/db/types';

/**
 * Auth middleware - Attaches user and session to context if authenticated
 *
 * Does not block requests - use requireAuth for protected routes.
 */
export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const auth = createAuth(c.env);

  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (session?.user && session?.session) {
      // Cast user to access custom fields defined in Better Auth config
      const user = session.user as typeof session.user & {
        platformRole?: string;
        isActive?: boolean;
      };

      c.set('user', {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        emailVerified: user.emailVerified,
        image: user.image ?? null,
        platformRole: (user.platformRole as PlatformRole) || 'user',
        isActive: user.isActive ?? true,
      });

      c.set('session', {
        id: session.session.id,
        userId: session.session.userId,
        expiresAt: session.session.expiresAt,
      });
    }
  } catch {
    // Session retrieval failed - user is not authenticated
    // Continue without setting user/session
  }

  await next();
});

/**
 * Require authentication - Returns 401 if not authenticated
 */
export const requireAuth = createMiddleware<HonoEnv>(async (c, next) => {
  const user = c.get('user');
  const session = c.get('session');

  if (!user || !session) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
      401
    );
  }

  // Check if user is active
  if (!user.isActive) {
    return c.json(
      {
        success: false,
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Your account has been suspended',
        },
      },
      403
    );
  }

  await next();
});

/**
 * Require email verification - Returns 403 if email not verified
 *
 * Must be used after requireAuth middleware.
 */
export const requireVerifiedEmail = createMiddleware<HonoEnv>(async (c, next) => {
  const user = c.get('user');

  if (!user) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
      401
    );
  }

  if (!user.emailVerified) {
    return c.json(
      {
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email address',
        },
      },
      403
    );
  }

  await next();
});

/**
 * Require specific platform role(s) - Returns 403 if user lacks required role
 *
 * Must be used after requireAuth middleware.
 *
 * @param allowedRoles - Array of roles that can access the route
 */
export function requireRole(...allowedRoles: PlatformRole[]) {
  return createMiddleware<HonoEnv>(async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        401
      );
    }

    if (!allowedRoles.includes(user.platformRole)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        },
        403
      );
    }

    await next();
  });
}

/**
 * Require super admin role
 *
 * Shorthand for requireRole('super_admin')
 */
export const requireSuperAdmin = requireRole('super_admin');

/**
 * Require operator or higher role
 *
 * Shorthand for requireRole('super_admin', 'operator')
 */
export const requireOperator = requireRole('super_admin', 'operator');
