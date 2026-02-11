# RSVP System

**Feature:** Complete RSVP workflow for event guest management
**Status:** Implemented
**Last Updated:** 2026-02-11

---

## Overview

The RSVP system allows event organizers to collect guest responses through a configurable public form. Guests receive a unique token link, submit their response (confirmed / declined / maybe), and can optionally provide plus-one counts, dietary restrictions, meal choices, addresses, and more. Organizers control every aspect of the RSVP experience through event settings.

### Key Capabilities

- Public, unauthenticated RSVP form via unique token links
- Configurable response options (yes/no/maybe)
- Optional deadline enforcement
- Per-field visibility toggles (dietary, meal, address, transportation, accessibility, custom fields)
- Plus-one management with adult/children split
- Hotel accommodation selection
- Confirmation emails after submission
- Batch invitation sending
- Full audit trail of all RSVP changes

---

## Table of Contents

1. [Database Schema](./schema.md)
2. [API Endpoints](./api.md)
3. [Frontend Components](./components.md)
4. [Data Hooks](./hooks.md)
5. [Validation & Business Rules](./validation.md)
6. [System Flow](./flow.md)

---

## Architecture Summary

```
Organizer Dashboard                        Public Guest Page
┌───────────────────┐                      ┌───────────────────┐
│  RsvpSettings     │──PATCH──►            │  RsvpView         │
│  RsvpFormField    │  /events/:uuid/      │  /rsvp/:token     │
│  Settings         │  rsvp-settings       │                   │
└───────────────────┘                      └─────┬─────────────┘
                                                 │
                                           GET /rsvp/:token
                                           POST /rsvp/:token
                                                 │
                                                 ▼
                                         ┌───────────────┐
                                         │   Backend      │
                                         │   (Hono API)   │
                                         └───────┬───────┘
                                                 │
                              ┌──────────────────┼──────────────────┐
                              ▼                  ▼                  ▼
                        ┌──────────┐     ┌────────────┐     ┌────────────┐
                        │  guests  │     │  eventRsvp │     │  guestAudit│
                        │  table   │     │  Settings  │     │  table     │
                        └──────────┘     └────────────┘     └────────────┘
```

---

## File Manifest

### Backend

| File | Purpose |
|------|---------|
| `backend/src/routes/rsvp.ts` | Public RSVP endpoints (GET + POST by token) |
| `backend/src/routes/guests.ts` | Invitation sending + resend endpoints |
| `backend/src/db/schema/events.ts` | `eventRsvpSettings` table + guest RSVP columns |
| `backend/src/db/schema/relations.ts` | Table relations |
| `backend/src/lib/email.ts` | RSVP confirmation email sending |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/pages/rsvp/[token].astro` | Public RSVP page (SSR) |
| `frontend/src/components/guests/RsvpView.tsx` | Public RSVP form component |
| `frontend/src/components/events/RsvpSettings.tsx` | Organizer RSVP settings |
| `frontend/src/components/events/RsvpFormFieldSettings.tsx` | RSVP form field toggles |
| `frontend/src/components/events/EventSettingsView.tsx` | Settings page integration |
| `frontend/src/hooks/use-events.ts` | RSVP settings hooks |
| `frontend/src/hooks/use-guests.ts` | RSVP data + submission hooks |

---

## Quick Reference

### RSVP Statuses

| Status | Description |
|--------|-------------|
| `pending` | Guest added but not yet invited |
| `invited` | Invitation sent, awaiting response |
| `confirmed` | Guest accepted the invitation |
| `declined` | Guest declined the invitation |
| `maybe` | Guest responded "maybe" (if allowed) |

### RSVP Form Fields (Toggles)

| Field | Default | Dependency |
|-------|---------|------------|
| `dietaryRestrictions` | `true` | None |
| `mealChoice` | `false` | Requires `enableMealChoice` in Guest Settings |
| `notes` | `false` | None |
| `address` | `false` | Requires `enableAddress` in Guest Settings |
| `transportation` | `false` | Requires `enableTransportation` in Guest Settings |
| `accessibility` | `false` | Requires `enableAccessibility` in Guest Settings |
| `customFields` | `false` | Requires `customFieldDefinitions` in Guest Settings |
