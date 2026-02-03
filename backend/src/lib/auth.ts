/**
 * Better Auth Configuration Factory
 *
 * Creates a Better Auth instance configured for Cloudflare Workers.
 * Must be called per-request since env is not available at module level.
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import type { Env } from '@/types/env';
import { sendVerificationEmail, sendPasswordResetEmail } from './email';

/**
 * Creates a Better Auth instance for the given environment
 *
 * @param env - Cloudflare Workers environment bindings
 * @returns Configured Better Auth instance
 */
export function createAuth(env: Env) {
  const db = drizzle(env.DB, { schema });

  // Determine base URL based on environment
  const baseURL =
    env.ENVIRONMENT === 'production'
      ? 'https://api.planloo.com'
      : env.ENVIRONMENT === 'staging'
        ? 'https://staging-api.planloo.com'
        : 'http://localhost:8787';

  // Build social providers array conditionally
  const socialProviders: ReturnType<typeof betterAuth>['options']['socialProviders'] = {};

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    socialProviders.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }

  return betterAuth({
    baseURL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.FRONTEND_URL],

    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail(env, {
          to: user.email,
          resetUrl: url,
        });
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail(env, {
          to: user.email,
          verificationUrl: url,
        });
      },
    },

    socialProviders:
      Object.keys(socialProviders).length > 0 ? socialProviders : undefined,

    user: {
      additionalFields: {
        platformRole: {
          type: 'string',
          defaultValue: 'user',
          input: false,
        },
        phone: {
          type: 'string',
          required: false,
        },
        isActive: {
          type: 'boolean',
          defaultValue: true,
          input: false,
        },
        suspendedAt: {
          type: 'date',
          required: false,
          input: false,
        },
        suspendedReason: {
          type: 'string',
          required: false,
          input: false,
        },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every 24 hours
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },

    advanced: {
      crossSubDomainCookies:
        env.ENVIRONMENT === 'production'
          ? {
              enabled: true,
              domain: '.planloo.com',
            }
          : {
              enabled: false,
            },
      defaultCookieAttributes: {
        secure: env.ENVIRONMENT !== 'development',
        httpOnly: true,
        sameSite: 'lax',
      },
    },
  });
}

/**
 * Type helper for the auth instance
 */
export type Auth = ReturnType<typeof createAuth>;
