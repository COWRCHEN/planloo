/**
 * Rate Limiting Middleware
 *
 * Uses Cloudflare KV for distributed rate limiting across Workers.
 * Protects auth endpoints from brute force attacks.
 */

import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '@/types/env';

interface RateLimitConfig {
  /** Time window in seconds */
  windowSeconds: number;
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Key prefix for KV storage */
  keyPrefix: string;
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

/**
 * Creates a rate limiting middleware with the specified configuration.
 *
 * @param config - Rate limit configuration
 * @returns Hono middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return createMiddleware<HonoEnv>(async (c, next) => {
    const kv = c.env.RATE_LIMIT_KV;

    // Skip rate limiting if KV is not configured (development without KV)
    if (!kv) {
      console.warn('RATE_LIMIT_KV not configured, skipping rate limit');
      return next();
    }

    // Use IP address as the rate limit key
    // Cloudflare provides CF-Connecting-IP header
    const ip = c.req.header('cf-connecting-ip') ||
               c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
               'unknown';

    const key = `${config.keyPrefix}:${ip}`;
    const now = Date.now();

    // Get current state from KV
    const stateJson = await kv.get(key);
    let state: RateLimitState;

    if (stateJson) {
      state = JSON.parse(stateJson);

      // Reset if window has passed
      if (now >= state.resetAt) {
        state = {
          count: 0,
          resetAt: now + config.windowSeconds * 1000,
        };
      }
    } else {
      state = {
        count: 0,
        resetAt: now + config.windowSeconds * 1000,
      };
    }

    // Increment count
    state.count++;

    // Calculate time until reset
    const timeUntilReset = Math.max(0, Math.ceil((state.resetAt - now) / 1000));
    const remaining = Math.max(0, config.maxRequests - state.count);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', Math.ceil(state.resetAt / 1000).toString());

    // Store updated state with TTL matching the window
    await kv.put(key, JSON.stringify(state), {
      expirationTtl: config.windowSeconds + 60, // Add buffer
    });

    // Check if rate limited
    if (state.count > config.maxRequests) {
      c.header('Retry-After', timeUntilReset.toString());

      return c.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
            retryAfter: timeUntilReset,
          },
        },
        429
      );
    }

    await next();
  });
}

/**
 * Pre-configured rate limiters for auth endpoints
 */
export const authRateLimiters = {
  /**
   * Sign-up: 5 requests per 15 minutes
   */
  signUp: rateLimit({
    windowSeconds: 15 * 60, // 15 minutes
    maxRequests: 5,
    keyPrefix: 'rl:signup',
  }),

  /**
   * Sign-in: 10 requests per 15 minutes
   */
  signIn: rateLimit({
    windowSeconds: 15 * 60, // 15 minutes
    maxRequests: 10,
    keyPrefix: 'rl:signin',
  }),

  /**
   * Forgot password: 3 requests per hour
   */
  forgotPassword: rateLimit({
    windowSeconds: 60 * 60, // 1 hour
    maxRequests: 3,
    keyPrefix: 'rl:forgotpw',
  }),
};
