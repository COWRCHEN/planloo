import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/**
 * Database Client Factory
 *
 * Creates a typed Drizzle database instance for Cloudflare D1.
 * This function should be called per-request in Cloudflare Workers.
 *
 * @param d1 - Cloudflare D1 database binding from env
 * @returns Typed Drizzle database instance
 *
 * @example
 * ```typescript
 * // In a Cloudflare Worker
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const db = createDbClient(env.DB);
 *     const users = await db.query.user.findMany();
 *     return Response.json(users);
 *   }
 * }
 * ```
 */
export function createDbClient(d1: D1Database) {
  return drizzle(d1, { schema });
}

/**
 * Type helper for the database client
 */
export type DbClient = ReturnType<typeof createDbClient>;

/**
 * Re-export schema for convenience
 */
export { schema };
