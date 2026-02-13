# Organizations & Event Collaboration

Multi-org membership and event collaboration system that extends personal event ownership with organization-based and collaborator-based access.

---

## Concepts

| Concept | Description |
|---------|-------------|
| **Personal event** | Owned by a single user (`events.userId`) |
| **Org event** | Owned by an organization (`events.organizationId`); all org members have access based on their org role |
| **Collaborator** | A user invited to a personal event with a specific role (owner/editor/viewer) |
| **Organization** | A team entity (company or family) with admin/member/viewer roles |

Events belong to **either** a user or an organization, never both.

---

## Access Model

All event access flows through `resolveEventAccess(db, eventUuid, userId)` in `backend/src/lib/event-access.ts`.

**Resolution order:**

1. Direct owner (`event.userId === userId`) &rarr; full permissions
2. Org member (lookup `organizationMember` for event's org) &rarr; permissions based on org role
3. Accepted collaborator (lookup `eventCollaborators`) &rarr; permissions based on collaborator role
4. No match &rarr; `null` (404)

**Permission matrix:**

| Access type | canEdit | canDelete | canManageGuests | canManageCollaborators | canManageBudget |
|-------------|---------|-----------|-----------------|----------------------|-----------------|
| owner | yes | yes | yes | yes | yes |
| org_admin | yes | yes | yes | yes | yes |
| org_member | yes | no | yes | no | yes |
| org_viewer | no | no | no | no | no |
| collaborator_owner | yes | no | yes | yes | yes |
| collaborator_editor | yes | no | yes | no | yes |
| collaborator_viewer | no | no | no | no | no |

---

## API Endpoints

### Organizations

Mounted at `/api/v1/organizations`.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | List user's organizations | requireAuth |
| POST | `/` | Create organization (creator becomes admin) | requireAuth + verified email |
| GET | `/check-slug` | Check slug availability | requireAuth |
| GET | `/:orgId` | Organization detail | requireAuth (member) |
| PATCH | `/:orgId` | Update organization | requireAuth (admin) |
| DELETE | `/:orgId` | Soft-delete organization | requireAuth (admin + creator) |

### Organization Members

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/:orgId/members` | List members | requireAuth (any member) |
| PATCH | `/:orgId/members/:memberId` | Change member role | requireAuth (admin) |
| DELETE | `/:orgId/members/:memberId` | Remove member or self-leave | requireAuth (admin or self) |

### Organization Invitations

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/:orgId/invitations` | Invite by email (7-day expiry, sends invitation email) | requireAuth (admin) |
| GET | `/:orgId/invitations` | List pending invitations | requireAuth (admin) |
| DELETE | `/:orgId/invitations/:invitationId` | Revoke invitation | requireAuth (admin) |

### Invitation Acceptance

Mounted at `/api/v1/invitations`.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/pending` | List pending invitations for the current user's email | requireAuth |
| GET | `/:token` | Get invitation details (org name, role, inviter) | **Public** (no auth) |
| POST | `/accept` | Accept invitation (email must match) | requireAuth |

> **Note:** `GET /:token` is intentionally public so email recipients can view invitation details before logging in or creating an account.
> `GET /pending` is used by the dashboard banner to surface invitations the user may have missed.

### Event Collaborators

Mounted at `/api/v1/events/:eventUuid/collaborators`.

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/` | List collaborators | any event access |
| POST | `/` | Invite collaborator by email | canManageCollaborators |
| PATCH | `/:collaboratorId` | Update role | canManageCollaborators |
| DELETE | `/:collaboratorId` | Remove or self-leave | canManageCollaborators or self |

Collaborators are auto-accepted on invite. The invited user must have a Planloo account.

### Updated Existing Endpoints

- **GET /api/v1/me** &mdash; now includes `organizations: [{ id, name, slug, role }]`
- **GET /api/v1/events** &mdash; returns personal + org + collaborator events; supports `?source=personal|organization|collaboration|all`
- **GET /api/v1/events/:uuid** &mdash; response includes `_access` object with permission flags
- **GET /api/v1/events/stats** &mdash; counts include org and collaborator events
- **GET /api/v1/budget/summary** &mdash; aggregates across org and collaborator events

---

## Invitation Email Flow

When an admin invites a member via `POST /:orgId/invitations`, the backend:

1. Creates an `organizationInvitation` row with a UUID token (7-day expiry)
2. Sends an invitation email via `sendOrgInvitationEmail()` (fire-and-forget using `waitUntil`)
3. The email contains an **Accept Invitation** button linking to `{FRONTEND_URL}/invitations/{token}`

In development (no `EMAIL_API_KEY`), the email content is logged to the console instead of being sent via Resend.

### Invitation Acceptance UX

The `/invitations/{token}` page handles both authenticated and unauthenticated users:

```
Email link clicked
       │
       ▼
GET /invitations/:token (public)
  → Shows org name, role, inviter
       │
       ├── User is logged in?
       │     ├── Yes → "Accept" / "Decline" buttons
       │     │           │
       │     │           ▼
       │     │    POST /invitations/accept (requireAuth)
       │     │           │
       │     │           ▼
       │     │    Redirect to /dashboard/organizations/:orgId
       │     │
       │     └── No → "Log In" / "Create Account" buttons
       │               (both preserve returnUrl=/invitations/{token})
       │               │
       │               ├── Existing user → /login?returnUrl=...
       │               │     → After login → back to /invitations/{token}
       │               │
       │               └── New user → /register?returnUrl=...
       │                     → signUp passes callbackURL to Better Auth
       │                     → Verification email link includes callbackURL=/invitations/{token}
       │                     → /verify-email → "Continue to Invitation" button
       │                     → autoSignInAfterVerification: true
       │                     → Back to /invitations/{token} → Accept
```

### Dashboard Pending Invitations Banner

As a fallback for when the email link or `callbackURL` chain is lost (e.g. user closes tab, verification email redirects to `/dashboard`), the dashboard proactively shows any pending invitations:

- `GET /api/v1/invitations/pending` returns all non-expired, non-accepted invitations matching the user's email
- `PendingInvitationsBanner` component renders at the top of `DashboardView`, above stats
- Each invitation shows org name, role, inviter name, and a "View Invitation" link
- Dismissible per session (state resets on page reload)
- Banner disappears automatically once the invitation is accepted or expires

This is the primary discovery mechanism — works regardless of how the user reached the dashboard (direct login, OAuth, bookmark, etc.).

### Key Implementation Details

| Concern | Solution |
|---------|----------|
| Email sending doesn't block API response | `c.executionCtx.waitUntil()` (Cloudflare Workers background task) |
| Email failures don't break invitation creation | `.catch()` logs error, invitation is still created |
| Unauthenticated users can view invitation | `GET /invitations/:token` has no auth middleware |
| Pending invitations shown on dashboard | `GET /invitations/pending` + `PendingInvitationsBanner` component |
| `returnUrl` preserved through registration | Passed as `callbackURL` to `authClient.signUp.email()` → included in verification email |
| User auto-signed-in after verification | `autoSignInAfterVerification: true` in Better Auth config |
| Email must match to accept | `POST /invitations/accept` checks `invitation.email === user.email` |

---

## Database Tables

Already defined in `backend/src/db/schema/`:

- `organization` &mdash; id, name, slug, type, description, createdBy
- `organizationMember` &mdash; organizationId, userId, role (admin/member/viewer)
- `organizationInvitation` &mdash; organizationId, email, role, token, expiresAt, acceptedAt
- `eventCollaborators` &mdash; eventId, userId, role (owner/editor/viewer), invitedBy, acceptedAt

---

## Frontend

### Pages

| Route | File | Layout |
|-------|------|--------|
| `/dashboard/organizations` | `pages/dashboard/organizations/index.astro` | DashboardLayout |
| `/dashboard/organizations/new` | `pages/dashboard/organizations/new.astro` | DashboardLayout |
| `/dashboard/organizations/[id]` | `pages/dashboard/organizations/[id].astro` | DashboardLayout |
| `/invitations/[token]` | `pages/invitations/[token].astro` | BaseLayout |

### Hooks

**`hooks/use-organizations.ts`** &mdash; TanStack Query hooks:

- `useOrganizations()`, `useOrganization(orgId)`, `useCheckOrgSlug(slug)`
- `useCreateOrganization()`, `useUpdateOrganization(orgId)`, `useDeleteOrganization()`
- `useOrgMembers(orgId)`, `useUpdateMemberRole(orgId)`, `useRemoveMember(orgId)`
- `useOrgInvitations(orgId)`, `useInviteMember(orgId)`, `useRevokeInvitation(orgId)`
- `useInvitationDetails(token)`, `useAcceptInvitation()`

**`hooks/use-collaborators.ts`** &mdash; TanStack Query hooks:

- `useCollaborators(eventUuid)`, `useInviteCollaborator(eventUuid)`
- `useUpdateCollaboratorRole(eventUuid)`, `useRemoveCollaborator(eventUuid)`

### Components

**`components/organizations/`**

| Component | Description |
|-----------|-------------|
| `OrganizationsView` | Org list grid with cards |
| `CreateOrgView` | Create form with slug auto-generation and availability check |
| `OrgDetailView` | Tabs: Members (role management), Invitations, Settings (delete) |
| `AcceptInvitationView` | Invitation acceptance page |
| `OrgRoleBadge` | Badge for admin/member/viewer |

**`components/dashboard/`** (new)

| Component | Description |
|-----------|-------------|
| `PendingInvitationsBanner` | Shows pending org invitations at the top of the dashboard |

**`components/events/`** (new)

| Component | Description |
|-----------|-------------|
| `CollaboratorsList` | Collaborators table with inline role editing and remove |
| `InviteCollaboratorDialog` | Dialog to invite by email with role select |
| `CollaboratorRoleBadge` | Badge for owner/editor/viewer |

### Modified Components

- **`EventForm`** &mdash; optional organization select on step 1 (only shown when user belongs to orgs, only for new events)
- **`EventFilters`** &mdash; source filter dropdown (All / Personal / Organization / Shared with Me)
- **`EventList`** &mdash; source filter state wired to EventFilters
- **`EventSettingsView`** &mdash; Collaborators accordion section (personal events only; org events use org membership)
- **`DashboardLayout`** &mdash; Organizations link in sidebar navigation

---

## File Inventory

### New Files

```
backend/src/lib/event-access.ts
backend/src/routes/organizations.ts
backend/src/routes/event-collaborators.ts
shared/schemas/organization.ts
shared/schemas/collaborator.ts
frontend/src/hooks/use-organizations.ts
frontend/src/hooks/use-collaborators.ts
frontend/src/components/organizations/index.ts
frontend/src/components/organizations/OrgRoleBadge.tsx
frontend/src/components/organizations/OrganizationsView.tsx
frontend/src/components/organizations/CreateOrgView.tsx
frontend/src/components/organizations/OrgDetailView.tsx
frontend/src/components/organizations/AcceptInvitationView.tsx
frontend/src/components/events/CollaboratorsList.tsx
frontend/src/components/events/InviteCollaboratorDialog.tsx
frontend/src/components/events/CollaboratorRoleBadge.tsx
frontend/src/components/dashboard/PendingInvitationsBanner.tsx
frontend/src/pages/dashboard/organizations/index.astro
frontend/src/pages/dashboard/organizations/new.astro
frontend/src/pages/dashboard/organizations/[id].astro
frontend/src/pages/invitations/[token].astro
```

### Modified Files

```
backend/src/routes/index.ts          # mount routes, /me orgs, invitations (public GET, pending), budget summary
backend/src/routes/organizations.ts  # invitation email sending via sendOrgInvitationEmail
backend/src/routes/events.ts         # resolveEventAccess, source filter, stats
backend/src/routes/budget.ts         # resolveEventAccess
backend/src/routes/guests.ts         # resolveEventAccess
backend/src/routes/event-providers.ts # resolveEventAccess
backend/src/routes/notification-settings.ts # resolveEventAccess
backend/src/types/env.ts             # EventAccess in HonoEnv Variables
backend/src/lib/email.ts             # sendOrgInvitationEmail
shared/schemas/index.ts              # barrel exports
frontend/src/hooks/use-events.ts     # source filter, CreateEventInput.organizationId
frontend/src/hooks/use-organizations.ts # usePendingInvitations hook, accept invalidates pending
frontend/src/hooks/use-auth.ts       # useSignUp accepts callbackURL for verification email redirect
frontend/src/components/dashboard/DashboardView.tsx  # PendingInvitationsBanner integration
frontend/src/components/dashboard/index.ts           # barrel export for PendingInvitationsBanner
frontend/src/components/events/index.ts
frontend/src/components/events/EventForm.tsx
frontend/src/components/events/EventList.tsx
frontend/src/components/events/EventFilters.tsx
frontend/src/components/events/EventSettingsView.tsx
frontend/src/components/auth/RegisterForm.tsx   # passes returnUrl as callbackURL to signup
frontend/src/components/auth/RegisterView.tsx   # accepts returnUrl prop
frontend/src/components/auth/VerifyEmailHandler.tsx # invitation-aware button label
frontend/src/pages/register.astro    # reads returnUrl query param
frontend/src/layouts/DashboardLayout.astro
```
