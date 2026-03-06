# GEO (Generative Engine Optimization)

GEO optimizes Planloo's content for AI-powered answer engines — ChatGPT, Perplexity, Google AI Overviews, Bing Copilot, Claude, and similar tools. Unlike traditional SEO which targets ranked search results, GEO targets AI-generated answers and citations.

## What Was Implemented

### 1. `llms.txt` (`frontend/public/llms.txt`)

An emerging standard (analogous to `robots.txt`) that provides AI crawlers with a structured, plain-text description of what Planloo is. LLMs use this file when indexing the site to understand the product, its features, pricing, and key URLs — without having to parse HTML.

**Sections included:**
- Product summary (one-line description)
- What is Planloo (plain language explanation)
- Core features (Guest Management, Budget, Tasks, Seating, Collaboration, Vendors)
- Pricing overview
- Target audience
- Technical details
- Company / contact info
- Key page URLs

**Reference:** [llmstxt.org](https://llmstxt.org)

---

### 2. AI Bot Rules in `robots.txt` (`frontend/public/robots.txt`)

Explicit `Allow` directives were added for known AI crawler user agents. Without these, some AI bots default to not indexing. Explicit rules also signal willingness to be cited.

**Bots added:**
| User-agent | Owner |
|---|---|
| `GPTBot` | OpenAI (training) |
| `ChatGPT-User` | OpenAI (browsing) |
| `anthropic-ai` | Anthropic (training) |
| `ClaudeBot` | Anthropic (browsing) |
| `PerplexityBot` | Perplexity |
| `Google-Extended` | Google (Gemini / AI Overviews training) |
| `cohere-ai` | Cohere |

All AI bots follow the same rules as `*`: public marketing pages allowed, `/dashboard/`, `/admin/`, `/api/`, `/rsvp/`, `/invitations/` disallowed.

---

### 3. FAQ Schema (`frontend/src/pages/index.astro`)

A `FAQPage` JSON-LD block was added to the homepage. Google AI Overviews and other generative engines heavily use `FAQPage` structured data when generating answers to broad queries like "how do I plan an event" or "best event planning tools".

**Questions covered:**
1. What is Planloo?
2. Is Planloo free to use?
3. What types of events can I plan with Planloo?
4. Can multiple people collaborate on an event in Planloo?
5. How does guest management work in Planloo?
6. Does Planloo have a seating planner?
7. Can I manage vendors and service providers in Planloo?

The schema is passed into `BaseLayout` via the existing `schema` prop array alongside `websiteSchema`, `organizationSchema`, and `softwareSchema`.

---

### 4. `sameAs` on Organization Schema (`frontend/src/pages/index.astro`)

`sameAs` links were added to the existing `Organization` JSON-LD schema pointing to Planloo's social profiles (Twitter, LinkedIn). AI engines use `sameAs` to resolve entity identity across the web — confirming that the Organization described in the schema and the social profiles are the same entity, which increases citation confidence.

```json
"sameAs": [
  "https://twitter.com/planloo",
  "https://www.linkedin.com/company/planloo"
]
```

---

## Files Changed

| File | Change |
|---|---|
| `frontend/public/llms.txt` | Created — LLM crawler description file |
| `frontend/public/robots.txt` | Updated — added AI bot user-agent rules |
| `frontend/src/pages/index.astro` | Updated — added FAQ schema + `sameAs` to Organization schema |

### 5. Feature Landing Pages with HowTo Schema (`frontend/src/pages/features/[slug].astro`)

Six static feature pages generated from a single dynamic route, each with a `HowTo` JSON-LD block. HowTo schema is heavily used by Google AI Overviews and Perplexity when answering procedural queries ("how do I manage event guests", "how to create a seating plan").

**Pages generated:**
| Slug | URL |
|---|---|
| `guest-management` | `/features/guest-management` |
| `budgeting` | `/features/budgeting` |
| `task-tracking` | `/features/task-tracking` |
| `seating-planner` | `/features/seating-planner` |
| `team-collaboration` | `/features/team-collaboration` |
| `vendor-directory` | `/features/vendor-directory` |

Each page includes:
- `HowTo` schema with 6 numbered steps (position, name, text)
- `BreadcrumbList` schema (Home → Features → [Feature Name])
- Unique `title`, `description`, and `og:image` via `BaseLayout`
- A rendered step-by-step guide that matches the schema content

All 6 URLs were also added to `frontend/src/pages/sitemap.xml.ts` at priority `0.8`.

---

### 6. `llms-full.txt` (`frontend/public/llms-full.txt`)

An extended product documentation file for AI assistants that need more than the summary in `llms.txt`. Referenced from `llms.txt` via a link so AI crawlers can discover it.

**Sections:**
- Product overview
- All 6 core features with full capability lists and feature page URLs
- Pricing tiers (Free, Pro, Enterprise)
- Target user personas
- Getting started guide
- Technical details (platform, mobile, auth, hosting)
- Full FAQ (8 questions)
- Company information
- Key URLs table for citation

---

## Files Changed

| File | Change |
|---|---|
| `frontend/public/llms.txt` | Created — LLM crawler summary; updated to link to `llms-full.txt` |
| `frontend/public/llms-full.txt` | Created — extended product documentation for AI assistants |
| `frontend/public/robots.txt` | Updated — added AI bot user-agent rules |
| `frontend/src/pages/index.astro` | Updated — added FAQ schema + `sameAs` to Organization schema |
| `frontend/src/pages/features/[slug].astro` | Created — 6 feature landing pages with HowTo + BreadcrumbList schema |
| `frontend/src/pages/sitemap.xml.ts` | Updated — added 6 feature page URLs |

## Future GEO Improvements

- **`SpeakableSpecification`** schema for voice/AI search
- **Author / About page** with `Person` schema for E-E-A-T signals
- **Fact-dense content** — statistics and specific numbers in marketing copy
- **Third-party citations** — getting mentioned on credible external sites (directories, review sites, press)
