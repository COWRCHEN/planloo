import { Hono } from 'hono';
import type { HonoEnv } from '@/types/env';
import { requireAuth } from '@/middleware/auth';

const location = new Hono<HonoEnv>();

location.get('/detect', requireAuth, async (c) => {
  const cf = (c.req.raw as Request & {
    cf?: { city?: string; country?: string; postalCode?: string; regionCode?: string };
  }).cf;

  if (!cf?.country) {
    return c.json({ success: true, data: { detected: false } });
  }
  const country = cf.country.toUpperCase();
  return c.json({
    success: true,
    data: {
      detected: true,
      city: cf.city ?? null,
      state: cf.regionCode ?? null,
      postalCode: cf.postalCode ?? null,
      country,
    },
  });
});

export default location;
