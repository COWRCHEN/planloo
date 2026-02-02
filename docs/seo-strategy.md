# SEO Strategy - Planloo

## Overview

This document outlines the comprehensive SEO strategy for Planloo to achieve excellent discoverability in search engines and drive organic traffic.

**Goals:**
- Achieve Lighthouse SEO score > 95
- Rank in top 10 for target keywords within 6 months
- Drive 50% of traffic from organic search by month 12

---

## Technical SEO

### 1. Server-Side Rendering (SSR)

**Implementation:**
- Use Astro's hybrid rendering mode
- SSR for all public pages (homepage, directory pages, RSVP pages)
- SSG for static marketing pages
- Ensure HTML is fully rendered before page load

**Benefits:**
- Search engines can crawl and index content
- Faster First Contentful Paint (FCP)
- Better user experience

**Pages Requiring SSR:**
- Homepage (/)
- Provider directory (/providers)
- Provider detail pages (/providers/:slug)
- Venue directory (/venues)
- Venue detail pages (/venues/:slug)
- Public RSVP pages (/rsvp/:token)
- Blog/resource pages (future)

---

### 2. Meta Tags Implementation

**Required Meta Tags for Every Page:**

```html
<!-- Primary Meta Tags -->
<title>Page Title | Planloo - Event Planning Made Easy</title>
<meta name="title" content="Page Title | Planloo">
<meta name="description" content="150-160 character description with target keywords">
<meta name="keywords" content="event planning, wedding planner, event coordinator">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://planloo.com/page">
<meta property="og:title" content="Page Title | Planloo">
<meta property="og:description" content="150-160 character description">
<meta property="og:image" content="https://planloo.com/og-image.jpg">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="https://planloo.com/page">
<meta property="twitter:title" content="Page Title | Planloo">
<meta property="twitter:description" content="150-160 character description">
<meta property="twitter:image" content="https://planloo.com/og-image.jpg">

<!-- Canonical URL -->
<link rel="canonical" href="https://planloo.com/page">

<!-- Mobile -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

**Page-Specific Titles and Descriptions:**

| Page | Title | Description |
|------|-------|-------------|
| Homepage | Planloo - Event Planning Made Easy \| Plan Weddings, Birthdays & More | Plan perfect events with Planloo. Manage guests, track budgets, find vendors, and coordinate venues for weddings, birthdays, corporate events & more. |
| Provider Directory | Find Event Service Providers \| Caterers, DJs, Photographers \| Planloo | Discover trusted event service providers. Browse caterers, photographers, DJs, florists, and more for your wedding, birthday, or corporate event. |
| Venue Directory | Find Event Venues \| Wedding Halls, Conference Centers \| Planloo | Search and book perfect event venues. Compare banquet halls, outdoor spaces, hotels, and conference centers for your special occasion. |
| RSVP Page | RSVP for [Event Name] \| Planloo | Respond to your event invitation for [Event Name]. Confirm attendance, dietary preferences, and plus-ones. |

---

### 3. Structured Data (Schema.org)

**Event Schema for RSVP Pages:**

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Summer Wedding - John & Jane",
  "description": "Join us for a beautiful outdoor wedding celebration",
  "startDate": "2026-08-15T14:00:00-07:00",
  "endDate": "2026-08-15T22:00:00-07:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Sunset Gardens",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Garden Lane",
      "addressLocality": "San Francisco",
      "addressRegion": "CA",
      "postalCode": "94102",
      "addressCountry": "US"
    }
  },
  "image": "https://cdn.planloo.com/events/event123.jpg",
  "organizer": {
    "@type": "Person",
    "name": "John Doe"
  }
}
```

**LocalBusiness Schema for Service Providers:**

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Delicious Catering Co.",
  "image": "https://cdn.planloo.com/providers/provider123.jpg",
  "@id": "https://planloo.com/providers/delicious-catering-co",
  "url": "https://planloo.com/providers/delicious-catering-co",
  "telephone": "+1-234-567-8900",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "456 Chef Street",
    "addressLocality": "San Francisco",
    "addressRegion": "CA",
    "postalCode": "94103",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "priceRange": "$$$",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "127"
  },
  "review": [
    {
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": "Jane Smith"
      },
      "datePublished": "2026-01-15",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5"
      },
      "reviewBody": "Exceptional service! Highly recommend."
    }
  ]
}
```

**Organization Schema for Homepage:**

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Planloo",
  "url": "https://planloo.com",
  "logo": "https://planloo.com/logo.png",
  "description": "Event planning and coordination platform for weddings, birthdays, corporate events, and more.",
  "sameAs": [
    "https://twitter.com/planloo",
    "https://facebook.com/planloo",
    "https://linkedin.com/company/planloo"
  ]
}
```

---

### 4. XML Sitemap

**Generate Dynamic Sitemap:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>https://planloo.com/</loc>
    <lastmod>2026-02-02</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://planloo.com/providers</loc>
    <lastmod>2026-02-02</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://planloo.com/venues</loc>
    <lastmod>2026-02-02</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Dynamic Provider Pages -->
  <url>
    <loc>https://planloo.com/providers/delicious-catering-co</loc>
    <lastmod>2026-01-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <!-- Dynamic Venue Pages -->
  <url>
    <loc>https://planloo.com/venues/sunset-gardens</loc>
    <lastmod>2026-01-18</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
```

**Sitemap Frequency:**
- Regenerate daily
- Submit to Google Search Console
- Submit to Bing Webmaster Tools

---

### 5. Robots.txt

```
User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /api/

Sitemap: https://planloo.com/sitemap.xml
```

---

### 6. Canonical URLs

**Purpose:** Prevent duplicate content issues

**Implementation:**
- Every page has a canonical URL
- Use absolute URLs
- Ensure consistency (with/without trailing slash)

```html
<link rel="canonical" href="https://planloo.com/providers/delicious-catering-co">
```

---

### 7. URL Structure

**SEO-Friendly URLs:**
- Use hyphens, not underscores
- Lowercase only
- Include target keywords
- Keep URLs short and descriptive

**Examples:**
- Good: `/providers/wedding-catering-san-francisco`
- Bad: `/provider?id=123&category=catering`

**URL Structure by Section:**
- Homepage: `/`
- Provider directory: `/providers`
- Provider detail: `/providers/{slug}`
- Provider category: `/providers/category/{category}` (e.g., `/providers/category/catering`)
- Venue directory: `/venues`
- Venue detail: `/venues/{slug}`
- RSVP: `/rsvp/{token}`
- Blog: `/blog/{slug}` (future)

---

## On-Page SEO

### 1. Content Hierarchy

**Heading Structure:**
- One H1 per page (page title)
- H2 for major sections
- H3 for subsections
- Never skip heading levels

**Example (Provider Detail Page):**
```html
<h1>Delicious Catering Co. - Wedding Catering in San Francisco</h1>

<h2>About Our Catering Services</h2>
<p>Description...</p>

<h2>Our Menu Options</h2>
<h3>Buffet Style</h3>
<p>Details...</p>
<h3>Plated Dinner</h3>
<p>Details...</p>

<h2>Client Reviews</h2>
<h3>What Our Clients Say</h3>
```

---

### 2. Image Optimization

**Image SEO Best Practices:**
- Always include descriptive alt text
- Use descriptive file names (not IMG_1234.jpg)
- Compress images for fast loading
- Use modern formats (WebP, AVIF)
- Implement responsive images
- Lazy load below-fold images

**Example:**
```html
<img
  src="/images/delicious-catering-wedding-buffet.webp"
  alt="Elegant wedding buffet spread by Delicious Catering Co with assorted appetizers and entrees"
  width="800"
  height="600"
  loading="lazy"
>
```

---

### 3. Internal Linking

**Strategy:**
- Link from high-authority pages to important pages
- Use descriptive anchor text
- Link to related content
- Implement breadcrumb navigation

**Example Internal Links:**
- Homepage → Provider Directory → Provider Detail
- Provider Detail → Related Providers
- Blog Post → Relevant Provider Category
- Venue Detail → Nearby Venues

---

### 4. Content Optimization

**Provider/Venue Descriptions:**
- Minimum 300 words
- Include target keywords naturally
- Answer common questions
- Include location information
- Add unique selling points

**Keywords to Target:**
- Primary: event planning, wedding planner, event coordinator
- Secondary: catering services, event venues, party planning
- Long-tail: affordable wedding planner San Francisco, corporate event venue Los Angeles

---

## Performance SEO

### 1. Core Web Vitals

**Targets:**
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1

**Optimization Strategies:**
- Optimize images (compress, modern formats)
- Minimize JavaScript
- Use edge caching (Cloudflare CDN)
- Implement code splitting
- Lazy load non-critical content
- Optimize fonts (font-display: swap)

---

### 2. Mobile Optimization

**Mobile-First Approach:**
- Responsive design across all breakpoints
- Touch-friendly UI (44px minimum tap targets)
- Fast mobile load times (< 3s)
- Avoid intrusive interstitials
- Use viewport meta tag

**Mobile Testing:**
- Google Mobile-Friendly Test
- Lighthouse mobile audit
- Real device testing (iOS, Android)

---

### 3. Page Speed

**Optimization Checklist:**
- [ ] Minify CSS and JavaScript
- [ ] Enable Gzip/Brotli compression
- [ ] Leverage browser caching
- [ ] Use CDN for static assets
- [ ] Optimize database queries
- [ ] Implement edge caching
- [ ] Remove render-blocking resources
- [ ] Inline critical CSS

**Tools:**
- Google PageSpeed Insights
- Lighthouse
- WebPageTest
- GTmetrix

---

## Local SEO (Future Enhancement)

### 1. Google Business Profile

**For Service Providers:**
- Create Google Business Profile listings
- Verify business locations
- Add photos and services
- Collect and respond to reviews
- Post updates regularly

---

### 2. Local Citations

**NAP Consistency:**
- Ensure Name, Address, Phone are consistent across web
- List in local directories
- Add to industry-specific directories

---

## Content Strategy

### 1. Blog/Resource Center (Future)

**Topic Ideas:**
- "How to Plan a Wedding in 6 Months"
- "Budget-Friendly Event Planning Tips"
- "Top 10 Wedding Venues in [City]"
- "How to Choose a Caterer for Your Event"
- "Event Planning Checklist"

**SEO Benefits:**
- Target long-tail keywords
- Build topical authority
- Create backlink opportunities
- Drive organic traffic

---

### 2. User-Generated Content

**Reviews and Testimonials:**
- Encourage users to leave reviews
- Display reviews on provider/venue pages
- Implement review schema markup
- Respond to reviews

**Benefits:**
- Fresh, unique content
- Social proof
- Improved rankings
- Long-tail keyword coverage

---

## Link Building Strategy

### 1. Quality Backlinks

**Target Link Sources:**
- Wedding blogs and publications
- Event planning directories
- Local business directories
- Industry associations
- Guest posting on relevant blogs

**Link Building Tactics:**
- Create valuable resources (guides, checklists)
- Reach out to event bloggers for features
- Get listed in "best of" roundups
- Partner with complementary businesses

---

### 2. Social Signals

**Social Media Presence:**
- Active on Instagram, Pinterest, Facebook
- Share event planning tips and inspiration
- Showcase provider/venue listings
- Engage with followers

**Benefits:**
- Brand awareness
- Referral traffic
- Indirect SEO benefits

---

## SEO Monitoring & Analytics

### 1. Tools to Use

**Required Tools:**
- Google Search Console
- Google Analytics 4
- Cloudflare Analytics
- Bing Webmaster Tools

**Optional Tools:**
- Ahrefs / SEMrush (keyword tracking)
- Screaming Frog (technical SEO audit)
- Google Trends (keyword research)

---

### 2. Key Metrics to Track

**Traffic Metrics:**
- Organic traffic volume
- Organic traffic percentage
- Bounce rate
- Pages per session
- Average session duration

**Ranking Metrics:**
- Keyword rankings (top 10 keywords)
- Click-through rate (CTR) in SERPs
- Impressions in search results
- Average position

**Engagement Metrics:**
- Time on page
- Scroll depth
- Conversion rate (event created, RSVP submitted)

**Technical Metrics:**
- Core Web Vitals scores
- Lighthouse scores (Performance, SEO, Accessibility)
- Crawl errors
- Index coverage

---

### 3. Monthly SEO Reporting

**Report Components:**
- Organic traffic growth
- Keyword ranking changes
- Top-performing pages
- Technical issues identified and fixed
- Backlink growth
- Recommendations for next month

---

## SEO Implementation Timeline

### Week 7 (SEO Sprint)

**Day 1-2: Technical SEO**
- Configure SSR for all public pages
- Implement meta tags component
- Add Schema.org markup

**Day 3-4: Content SEO**
- Optimize page titles and descriptions
- Implement proper heading hierarchy
- Add alt text to all images
- Create SEO-friendly URLs

**Day 5: Sitemap & Tools**
- Generate XML sitemap
- Configure robots.txt
- Submit sitemap to Google Search Console
- Set up Google Analytics 4

**Day 6-7: Testing & Validation**
- Run Lighthouse audits
- Test mobile responsiveness
- Validate structured data
- Check Core Web Vitals
- Fix any issues identified

---

## Target Keywords by Page Type

### Homepage
- Primary: event planning, event planner, event coordinator
- Secondary: wedding planner, party planner, event management

### Provider Directory
- Primary: event service providers, wedding vendors
- Secondary: caterers, event photographers, DJs

### Provider Detail (e.g., Catering)
- Primary: [business name]
- Secondary: wedding catering [city], event catering services
- Long-tail: affordable wedding catering [city], best caterer for weddings

### Venue Directory
- Primary: event venues, wedding venues
- Secondary: banquet halls, conference centers

### Venue Detail
- Primary: [venue name]
- Secondary: wedding venue [city], event space [city]
- Long-tail: outdoor wedding venue [city], small event venue [city]

---

## Competitive Analysis

### Top Competitors to Monitor

1. **The Knot** - Wedding planning platform
2. **Zola** - Wedding registry and planning
3. **WeddingWire** - Vendor directory
4. **Eventbrite** - Event management
5. **Cvent** - Corporate event management

**Competitor Analysis Tasks:**
- Identify their top-ranking keywords
- Analyze their content strategy
- Study their backlink profile
- Monitor their feature releases
- Learn from their UX/UI

---

## Success Metrics

### 3-Month Goals
- [ ] Lighthouse SEO score > 95
- [ ] 50+ pages indexed in Google
- [ ] 500+ organic visitors per month
- [ ] Top 50 rankings for 5 target keywords

### 6-Month Goals
- [ ] 2,000+ organic visitors per month
- [ ] Top 10 rankings for 10 target keywords
- [ ] 100+ quality backlinks
- [ ] 200+ provider/venue pages indexed

### 12-Month Goals
- [ ] 10,000+ organic visitors per month
- [ ] Top 3 rankings for 20 target keywords
- [ ] 500+ quality backlinks
- [ ] 50% of traffic from organic search

---

## SEO Checklist for Launch

**Pre-Launch:**
- [ ] All pages have unique title tags
- [ ] All pages have unique meta descriptions
- [ ] Schema.org markup implemented
- [ ] XML sitemap generated and submitted
- [ ] Robots.txt configured
- [ ] Canonical URLs on all pages
- [ ] All images have alt text
- [ ] Internal linking structure in place
- [ ] Google Search Console set up
- [ ] Google Analytics set up
- [ ] Core Web Vitals meet targets
- [ ] Mobile-friendly test passed
- [ ] Lighthouse SEO score > 95

**Post-Launch:**
- [ ] Monitor search console for errors
- [ ] Track keyword rankings
- [ ] Monitor organic traffic growth
- [ ] Fix any crawl errors
- [ ] Build quality backlinks
- [ ] Create blog content (ongoing)
- [ ] Optimize based on performance data

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | Product Manager | Initial SEO strategy document |
