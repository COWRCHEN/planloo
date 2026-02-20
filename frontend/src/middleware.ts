/**
 * Astro SSR Middleware
 *
 * Server-side auth guard for dashboard routes.
 * Redirects unauthenticated users to /login before the page renders.
 */

import { defineMiddleware } from 'astro:middleware';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Only guard /dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return next();
  }

  // Forward cookies to backend session endpoint
  const cookie = context.request.headers.get('cookie');
  if (!cookie) {
    const returnUrl = encodeURIComponent(pathname);
    return context.redirect(`/login?returnUrl=${returnUrl}`);
  }

  try {
    const res = await fetch(`${API_URL}/auth/get-session`, {
      headers: { cookie },
    });

    if (!res.ok) {
      const returnUrl = encodeURIComponent(pathname);
      return context.redirect(`/login?returnUrl=${returnUrl}`);
    }

    const body = await res.json() as { user?: Record<string, unknown>; session?: Record<string, unknown> };

    if (!body?.user) {
      const returnUrl = encodeURIComponent(pathname);
      return context.redirect(`/login?returnUrl=${returnUrl}`);
    }

    // Attach user/session to locals for downstream pages
    context.locals.user = body.user;
    context.locals.session = body.session ?? null;
  } catch {
    const returnUrl = encodeURIComponent(pathname);
    return context.redirect(`/login?returnUrl=${returnUrl}`);
  }

  return next();
});
