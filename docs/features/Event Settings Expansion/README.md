# Event Settings Expansion

**Status:** Planning
**Document Date:** 2026-02-08

---

## Overview

The event settings page (`/dashboard/events/[uuid]/settings`) currently contains only **Guest Field Settings** (common fields, guest fields, custom fields). This document outlines additional settings sections to be added, prioritized by impact and existing schema support.

---

## Current State

The settings page is a single accordion section "Guest Field Settings" with three tabs:

- **Common Fields** - required toggles for first name, last name, email, phone
- **Guest Fields** - enable/require optional fields (address, meal choice, accommodation, plus-ones, table assignment, transportation, accessibility, category)
- **Custom Fields** - user-defined fields (text, number, select, multiselect, date, checkbox)

No other event-level settings are exposed.

---

## Planned Settings Sections

### P0 - High Priority

| Section | Description | Status |
|---------|-------------|--------|
| [RSVP & Invitations](./rsvp-and-invitations.md) | RSVP behavior, deadlines, reminders, public RSVP page | Planning |
| [Event Privacy & Sharing](./event-privacy-and-sharing.md) | Visibility, custom slug, password protection, guest list visibility | Planning |

### P1 - Medium Priority

| Section | Description | Status |
|---------|-------------|--------|
| Collaborator & Permissions | Manage collaborators, roles, invite controls | Not started |
| Danger Zone | Archive, duplicate, delete event, data export | Not started |

### P2 - Lower Priority

| Section | Description | Status |
|---------|-------------|--------|
| Event Details / General | Timezone, currency, cover image, status, date format | Not started |
| Check-in Settings | Check-in mode, QR codes, self-check-in, VIP alerts | Not started |

### P3 - Future

| Section | Description | Status |
|---------|-------------|--------|
| Notifications & Communication | Email notifications, reminders, reply-to address | Not started |

---

## Settings Page Layout

As more sections are added, the page will evolve from a single accordion to multiple accordion sections. Each section is an independent accordion item with its own save/reset controls, following the same pattern as the existing Guest Field Settings.
