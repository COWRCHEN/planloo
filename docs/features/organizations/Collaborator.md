# Event Collaborators

Per-event sharing for users outside the organization (or when no organization exists). Collaborators grant a specific user access to a single event with a chosen role.

---

## Why Collaborators Exist (vs. Organization Roles)

Organizations and collaborators solve different access problems:

| Mechanism | Scope | Use case |
|-----------|-------|----------|
| **Organization roles** (`org_admin`, `org_member`, `org_viewer`) | All events assigned to the org | Team-wide access — every org member automatically sees every org event |
| **Collaborators** (`collaborator_owner`, `collaborator_editor`, `collaborator_viewer`) | A single event | Per-event invites — grant one user access to one event |

### When to use collaborators

1. **No org exists** — you want to share a personal event (e.g., invite your partner to co-manage a wedding) without creating an organization.
2. **Cross-org sharing** — the person you want to share with isn't in your org (e.g., an external vendor, a friend who isn't a family member).
3. **Granular per-event permissions** — within an org every member gets the same role on every org event. Collaborators let you give someone `editor` on one event without exposing others.

---

## Collaborator Roles

| Role | canEdit | canDelete | canManageGuests | canManageCollaborators | canManageBudget |
|------|---------|-----------|-----------------|------------------------|-----------------|
| owner | yes | no | yes | yes | yes |
| editor | yes | no | yes | no | yes |
| viewer | no | no | no | no | no |

> **Note:** Even a `collaborator_owner` cannot delete the event — only the direct event owner (`events.userId`) or an `org_admin` can delete.

---

## Access Resolution

Collaborator access is resolved as **step 3** in `resolveEventAccess()` (`backend/src/lib/event-access.ts`):

1. Direct owner (`event.userId === userId`) → full permissions
2. Org membership (lookup `organizationMember`) → permissions based on org role
3. **Accepted collaborator** (lookup `eventCollaborators` where `acceptedAt IS NOT NULL`) → permissions based on collaborator role
4. No match → `null` (404)

Because org membership is checked before collaborators, if a user belongs to the event's org **and** is a collaborator, the org role takes precedence.

---

## API Endpoints

Mounted at `/api/v1/events/:eventUuid/collaborators`.

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/` | List collaborators (includes user info and role) | Any event access |
| POST | `/` | Invite collaborator by email (auto-accepted) | `canManageCollaborators` |
| PATCH | `/:collaboratorId` | Update collaborator role | `canManageCollaborators` |
| DELETE | `/:collaboratorId` | Remove collaborator or self-leave | `canManageCollaborators` or self |

Collaborators are **auto-accepted** on invite. The invited user must already have a Planloo account.

---

## Database

### `eventCollaborators` table (`backend/src/db/schema/events.ts`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer (PK) | Auto-increment |
| `eventId` | integer (FK → events.id) | CASCADE on delete |
| `userId` | text (FK → user.id) | SET NULL on delete |
| `role` | text | `owner` / `editor` / `viewer` |
| `invitedByUserId` | text (FK → user.id) | SET NULL on delete |
| `invitedAt` | integer (timestamp) | When the invitation was created |
| `acceptedAt` | integer (timestamp) | When accepted (set immediately on invite) |
| `createdAt` | integer (timestamp) | Row creation time |

Indexes: `eventId`, `userId`.

---

## Shared Schemas

`shared/schemas/collaborator.ts` exports:

- `COLLABORATOR_ROLES` — `['owner', 'editor', 'viewer']`
- `CollaboratorRole` — Zod enum type
- `inviteCollaboratorSchema` — Zod schema for `POST /` body (`email`, `role`)
- `updateCollaboratorRoleSchema` — Zod schema for `PATCH /:collaboratorId` body (`role`)
- `CollaboratorResponse` — TypeScript interface for API responses

---

## Frontend

### Hooks (`frontend/src/hooks/use-collaborators.ts`)

| Hook | Description |
|------|-------------|
| `useCollaborators(eventUuid)` | Fetch collaborator list |
| `useInviteCollaborator(eventUuid)` | Invite by email with role |
| `useUpdateCollaboratorRole(eventUuid)` | Change an existing collaborator's role |
| `useRemoveCollaborator(eventUuid)` | Remove collaborator or self-leave |

### Components (`frontend/src/components/events/`)

| Component | Description |
|-----------|-------------|
| `CollaboratorsList` | Card listing collaborators with inline role editing and remove button; includes invite button |
| `InviteCollaboratorDialog` | Dialog with email input and role select (`editor` / `viewer`) |
| `CollaboratorRoleBadge` | Badge displaying `owner` / `editor` / `viewer` with distinct color variants |

`CollaboratorsList` is rendered inside `EventSettingsView` and is visible to anyone with event access.

---

## File Inventory

```
backend/src/db/schema/events.ts            # eventCollaborators table definition
backend/src/lib/event-access.ts            # resolveEventAccess step 3 (collaborator check)
backend/src/routes/event-collaborators.ts  # CRUD API
backend/src/routes/index.ts                # mounts collaborator routes
backend/src/routes/events.ts               # event list includes collaborator events (?source=collaboration)
shared/schemas/collaborator.ts             # Zod schemas and types
frontend/src/hooks/use-collaborators.ts    # TanStack Query hooks
frontend/src/components/events/CollaboratorsList.tsx
frontend/src/components/events/InviteCollaboratorDialog.tsx
frontend/src/components/events/CollaboratorRoleBadge.tsx
frontend/src/components/events/EventSettingsView.tsx  # renders CollaboratorsList
```
