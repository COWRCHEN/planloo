import type { APIRoute } from 'astro';

const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://planloo.com';

const pages = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/register', priority: '0.8', changefreq: 'monthly' },
  { path: '/login', priority: '0.7', changefreq: 'monthly' },
  { path: '/features/guest-management', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/budgeting', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/task-tracking', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/seating-planner', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/team-collaboration', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/vendor-directory', priority: '0.8', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.5', changefreq: 'yearly' },
  { path: '/terms', priority: '0.5', changefreq: 'yearly' },
];

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString().split('T')[0];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    ({ path, priority, changefreq }) => `  <url>
    <loc>${siteUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
