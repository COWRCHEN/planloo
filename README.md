# Planloo - Event Planning Platform

A modern, performant event planning SAAS platform built with Astro, Hono, and Cloudflare technologies.

## Overview

Planloo is a comprehensive event planning and coordination platform that helps users manage every aspect of their events - from guest lists and RSVPs to vendor coordination, venue booking, and budget tracking.

**Target Users:**
- Professional event planners
- Individual event hosts (weddings, birthdays, corporate events)
- Service providers (caterers, photographers, venues, etc.)

## Tech Stack

### Frontend
- **Framework:** Astro v5.17 (hybrid SSR/SSG)
- **UI Library:** React 18 (for interactive components)
- **Styling:** Tailwind CSS
- **State Management:** Nanostores
- **Type Safety:** TypeScript (strict mode)

### Backend
- **Framework:** Hono v4.x
- **Runtime:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite-based)
- **ORM:** Drizzle ORM
- **Authentication:** Better Auth

### Deployment
- **Frontend:** Cloudflare Pages
- **Backend:** Cloudflare Workers
- **Database:** Cloudflare D1
- **Storage:** Cloudflare R2 (images/files)
- **CDN:** Cloudflare CDN

## Project Structure

```
planloo/
├── docs/                           # Comprehensive documentation
│   ├── requirements.md            # Detailed feature requirements
│   ├── database-schema.md         # Database design and schema
│   ├── api-spec.md                # API endpoint specifications
│   ├── roadmap.md                 # 12-week development roadmap
│   ├── frontend-architecture.md   # Frontend architecture guide
│   ├── backend-architecture.md    # Backend architecture guide
│   ├── seo-strategy.md            # SEO optimization strategy
│   └── team-handoffs.md           # Team collaboration guide
│
├── frontend/                       # Astro frontend application
│   ├── src/
│   ├── public/
│   ├── astro.config.mjs
│   └── package.json
│
├── backend/                        # Hono backend API
│   ├── src/
│   ├── drizzle/
│   ├── wrangler.toml
│   └── package.json
│
└── README.md                      # This file
```

## Core Features

### MVP Features (12-week roadmap)

1. **Guest Management**
   - Create and manage guest lists
   - Track RSVPs and dietary restrictions
   - Import/export guests (CSV)
   - Public RSVP pages
   - Guest check-in functionality

2. **Budget Tracking**
   - Set event budgets by category
   - Track estimated vs. actual costs
   - Record payments and receipts
   - Visual budget breakdowns
   - Payment status tracking

3. **Service Provider Directory**
   - Browse providers by category (catering, photography, DJ, etc.)
   - View provider profiles and portfolios
   - Compare pricing and reviews
   - Request quotes
   - Link providers to events

4. **Venue Directory**
   - Search venues by location, capacity, amenities
   - View venue details and photos
   - Check availability
   - Compare multiple venues
   - Book venues for events

5. **Event Dashboard**
   - Overview of all events
   - Quick stats (guests, budget, tasks)
   - Event status tracking
   - Recent activity feed

6. **SEO & Performance**
   - Server-side rendering for public pages
   - Lighthouse score > 90 (Performance, SEO, Accessibility)
   - Mobile-responsive design
   - Core Web Vitals optimization

### Post-MVP Features

- Task/checklist management
- Event collaboration (co-planners)
- Calendar integrations
- Payment processing
- Email/SMS notifications
- Mobile native apps

## Documentation

All project documentation is located in the `docs/` directory:

### For Product Managers
- **requirements.md** - Complete feature requirements with user stories and acceptance criteria
- **roadmap.md** - 12-week phased development plan with dependencies

### For Designers
- **team-handoffs.md** - Design specifications and deliverables (Designer section)
- **requirements.md** - User flows and feature requirements

### For Developers
- **frontend-architecture.md** - Frontend structure, patterns, and best practices
- **backend-architecture.md** - Backend API structure and patterns
- **database-schema.md** - Complete database schema with Drizzle ORM definitions
- **api-spec.md** - RESTful API endpoint specifications
- **team-handoffs.md** - Development tasks and acceptance criteria (Developer section)

### For DevOps Engineers
- **team-handoffs.md** - Infrastructure setup and deployment procedures (DevOps section)
- **roadmap.md** - Deployment timeline and requirements

### For SEO/Marketing
- **seo-strategy.md** - Comprehensive SEO optimization guide

## Development Roadmap

### Phase 1: Foundation (Weeks 1-3)
- Project setup and infrastructure
- Authentication system
- Dashboard and event CRUD

### Phase 2: Core Features (Weeks 4-6)
- Guest management system
- Budget tracking
- Provider/Venue directory

### Phase 3: Optimization (Weeks 7-9)
- SEO implementation
- Mobile responsiveness and accessibility
- Performance optimization and testing

### Phase 4: Launch (Weeks 10-12)
- Review system and analytics
- Email notifications
- Production deployment

See `docs/roadmap.md` for detailed timeline and tasks.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Cloudflare account (for D1 database and Workers)
- Wrangler CLI (`npm install -g wrangler`)

### Installation

```bash
# Clone the repository
git clone https://github.com/cowrchen/planloo.git
cd planloo

# Install dependencies (once project is initialized)
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
wrangler d1 migrations apply planloo-db --local

# Start development server
npm run dev
```

### Development

```bash
# Frontend development
cd frontend
npm run dev

# Backend development
cd backend
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint

# Type check
npm run type-check
```

## Contributing

This is currently a private project. For team members:

1. Create a feature branch from `main`
2. Make your changes following the coding standards
3. Write/update tests
4. Create a pull request
5. Ensure CI/CD pipeline passes
6. Get code review approval
7. Merge to `main`

### Coding Standards
- TypeScript strict mode
- ESLint and Prettier configured
- Follow component patterns in architecture docs
- Write tests for new features
- Document complex logic

## Testing

- **Unit Tests:** Vitest
- **E2E Tests:** Playwright
- **Coverage Target:** 70%+

See `docs/frontend-architecture.md` and `docs/backend-architecture.md` for testing guidelines.

## Deployment

### Staging
```bash
npm run deploy:staging
```

### Production
```bash
npm run deploy:production
```

See `docs/team-handoffs.md` (DevOps section) for detailed deployment procedures.

## Performance Targets

- **Lighthouse Performance:** > 90
- **Lighthouse SEO:** > 95
- **Lighthouse Accessibility:** > 95
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3.5s
- **Core Web Vitals:** All "Good" ratings

## Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security

- HTTPS only
- Better Auth session-based authentication with HTTP-only cookies
- OAuth support (Google, GitHub)
- SQL injection prevention (via Drizzle ORM)
- XSS protection
- CSRF protection
- Rate limiting
- Input validation and sanitization

See `docs/backend-architecture.md` for security implementation details.

## License

Proprietary - All rights reserved

## Team

- **Product Manager:** Specification and roadmap
- **Designer:** UI/UX design
- **Developer:** Frontend and backend implementation
- **DevOps:** Infrastructure and deployment

## Support

For questions or issues:
- Check documentation in `docs/`
- Create an issue in GitHub
- Contact team lead

## Roadmap

See `docs/roadmap.md` for detailed development roadmap and feature prioritization.

## Acknowledgments

Built with:
- [Astro](https://astro.build/)
- [Hono](https://hono.dev/)
- [Better Auth](https://better-auth.com/)
- [Cloudflare](https://cloudflare.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Status:** Planning Phase (Pre-Development)
**Next Steps:** Review documentation and begin Phase 1 implementation

For detailed next steps, see `docs/team-handoffs.md`
