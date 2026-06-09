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
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, logEmail } from './email';
import { createDbClient } from '@/db/client';
import { hashPassword, verifyPassword } from './password-pbkdf2';

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

  const trustedOrigins = [env.FRONTEND_URL];
  if (env.ENVIRONMENT === 'development') {
    trustedOrigins.push(
      'http://localhost:4321',
      'http://127.0.0.1:4321',
      'http://10.0.48.174:4321'
    );
  }

  // Build social providers array conditionally
  const socialProviders: ReturnType<typeof betterAuth>['options']['socialProviders'] = {};

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }


  return betterAuth({
    baseURL,
    basePath: '/api/v1/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: Array.from(new Set(trustedOrigins)),

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
      // In development, use PBKDF2 to stay within Cloudflare Worker CPU time limits.
      // Default scrypt can exceed 10ms (free) / 50ms (paid) and cause 503.
      ...(env.ENVIRONMENT === 'development' && {
        password: {
          hash: (password) => hashPassword(password),
          verify: ({ password, hash }) => verifyPassword(password, hash),
        },
      }),
      sendResetPassword: async ({ user, url }) => {
        // Rewrite URL to point to frontend instead of backend
        const backendUrl = new URL(url);
        const frontendUrl = new URL('/reset-password', env.FRONTEND_URL);
        frontendUrl.search = backendUrl.search;

        await sendPasswordResetEmail(env, {
          to: user.email,
          resetUrl: frontendUrl.toString(),
        });
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        // Rewrite URL to point to frontend instead of backend
        // Original: http://backend/api/v1/auth/verify-email?token=...&callbackURL=/
        // New: http://frontend/verify-email?token=...&callbackURL=/
        const backendUrl = new URL(url);
        const frontendUrl = new URL('/verify-email', env.FRONTEND_URL);
        frontendUrl.search = backendUrl.search;

        await sendVerificationEmail(env, {
          to: user.email,
          verificationUrl: frontendUrl.toString(),
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

    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const db = createDbClient(env.DB);

            // Auto-provision free subscription for every new user
            try {
              await db
                .insert(schema.subscriptions)
                .values({ userId: user.id, plan: 'free', status: 'free' })
                .onConflictDoNothing();
            } catch (err) {
              console.error('Failed to create free subscription for user:', err);
            }

            // Send welcome email (best-effort)
            try {
              const result = await sendWelcomeEmail(env, {
                to: user.email,
                userName: user.name || 'there',
              });
              const actuallySent = Boolean(result.id);
              await logEmail({
                db,
                recipientEmail: user.email,
                emailType: 'welcome',
                subject: 'Welcome to Planloo!',
                status: actuallySent ? 'sent' : 'failed',
                resendId: result.id ?? undefined,
                errorMessage: actuallySent ? undefined : 'Email not sent (development mode or EMAIL_API_KEY not configured)',
                userId: user.id,
              });
            } catch (err) {
              console.error('Failed to send welcome email:', err);
              try {
                await logEmail({
                  db,
                  recipientEmail: user.email,
                  emailType: 'welcome',
                  subject: 'Welcome to Planloo!',
                  status: 'failed',
                  errorMessage: err instanceof Error ? err.message : 'Unknown error',
                  userId: user.id,
                });
              } catch {
                // logging failed too — nothing more we can do
              }
            }
          },
        },
      },
    },
  });
}

/**
 * Type helper for the auth instance
 */
export type Auth = ReturnType<typeof createAuth>;
