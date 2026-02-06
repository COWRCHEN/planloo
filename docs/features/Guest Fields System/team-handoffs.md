# Guest Fields System - Team Handoffs Document

**Project:** Planloo Event Planning SaaS
**Feature:** Flexible Guest Fields System
**Document Owner:** Product Manager
**Last Updated:** 2026-02-05
**Status:** Planning Phase

---

## Purpose

This document provides detailed specifications for each team member to execute their portion of the Guest Fields System project. Each section is written for a specific role and includes actionable requirements, technical constraints, and success criteria.

---

## 🎨 Designer Handoff

**Recipient:** Design Team
**Phase:** Phase 1 - Event-Type-Specific Fields
**Deadline:** Week 1 (Complete by end of week)

### Design Deliverables Required

#### 1. Guest Form (Updated)

**Context**: Current guest form is identical for all event types. We need dynamic forms that show event-specific fields.

**Requirements**:
- **Desktop Layout** (800px+ width)
  - Two-column form layout where applicable
  - Clear visual sections:
    - "Basic Information" (name, email, phone, category)
    - "RSVP & Attendance" (RSVP status, plus-ones, dietary restrictions)
    - Event-type-specific section (e.g., "Wedding Details", "Corporate Information")
  - Event-type section should have subtle background color or border to differentiate
  - All sections should be clearly labeled with section headers

- **Mobile Layout** (< 800px width)
  - Single-column stacked layout
  - Same section structure as desktop
  - Collapsible sections on mobile (accordion pattern) optional

- **Field-Specific Design Needs**:
  - **Enum fields** (wedding side, badge type, etc.): Use radio buttons for 2-3 options, dropdown for 4+
  - **Boolean checkboxes**: Gift thank you sent, special access, etc.
  - **Text areas**: Gift descriptions, notes (differentiate from single-line inputs)
  - **Help text**: Each event-specific field needs explanatory help text (subtle, below label)

- **States to Design**:
  - Default state
  - Filled state
  - Error state (validation errors)
  - Loading/disabled state (during submission)

**Assets Needed**:
- Figma component for each event-type section:
  - `WeddingFieldsSection`
  - `CorporateFieldsSection`
  - `ConferenceFieldsSection`
  - `BirthdayFieldsSection`
- Responsive breakpoints defined
- Color tokens for section backgrounds
- Typography scale for section headers vs. field labels

**Design Constraints**:
- Must use shadcn/ui components (reference: https://ui.shadcn.com/)
- Maintain existing brand colors and typography
- Form should not exceed 1200px max width on desktop
- Maintain accessibility (WCAG 2.1 AA): proper contrast, focus states, screen reader labels

**Example Flow**:
```
User selects event type "Wedding" when creating event
  ↓
Opens guest form for that wedding event
  ↓
Form shows:
  - Basic Information section (always visible)
  - RSVP & Attendance section (always visible)
  - Wedding Details section (only for weddings)
    • Which side? [Bride / Groom / Both] (radio buttons)
    • Invited to: [Ceremony / Reception / Both] (radio buttons)
    • Wedding gift: [text area]
    • Thank you sent: [checkbox]
    • Shower gift: [text area]
    • Thank you sent: [checkbox]
```

#### 2. Guest List Table (Updated)

**Context**: Table needs new columns for event-specific fields and smarter filtering.

**Requirements**:
- **New Table Columns**:
  - Current columns: Name, Contact, Category, RSVP, Check-in, Actions
  - Add dynamic columns based on event type:
    - Wedding: "Side" column (badge: Bride/Groom/Both)
    - Corporate: "Company" column (text)
    - Conference: "Badge Type" column (badge with color coding)
    - Birthday: "Relationship" column (text)

- **Column Behavior**:
  - Event-type columns appear after "Category", before "RSVP"
  - On mobile/tablet (<1024px), event-type columns hidden (show in detail view)
  - Columns should be sortable (ascending/descending)

- **Badge Design**:
  - Small pill-shaped badges with text
  - Color coding:
    - Bride's Side: soft pink/rose
    - Groom's Side: soft blue
    - Both: neutral gray
    - Badge types (conference): Use distinct colors for Speaker, VIP, Standard, etc.
  - Badge text should be readable at small sizes (12-14px)

- **Filter UI**:
  - Current filters: Category, RSVP Status, Search
  - Add event-type-specific filters:
    - Wedding: Filter by "Side" dropdown
    - Conference: Filter by "Badge Type" dropdown
  - Filters should stack horizontally, wrap on mobile
  - Active filters should show count badge (e.g., "Filters (2)")
  - Clear all filters button

**Assets Needed**:
- Updated table component design
- Badge component variants for each event type
- Filter UI component (multi-select dropdown)
- Responsive table design (mobile: card view)

#### 3. Guest Detail View (Modal)

**Context**: When clicking a guest row, show full details in a modal or side panel.

**Requirements**:
- Display all fields including event-specific ones
- Same visual grouping as form (sections)
- Edit button triggers guest form
- Should handle long text fields (gift descriptions) gracefully

**Assets Needed**:
- Modal/drawer component design
- Read-only field display patterns

#### 4. RSVP Public Form (Updated)

**Context**: Public-facing form that guests use to RSVP. Must also show event-specific fields when applicable.

**Requirements**:
- Similar layout to guest form but with simplified design
- Event-type fields should be optional for guest to fill (not required)
- Focus on meal choice, dietary restrictions, plus-ones (common RSVP fields)
- Event-specific fields like "gift description" should NOT appear in public RSVP (only in organizer's admin form)

**Out of Scope for Phase 1**: Configuration UI for which fields appear in RSVP (Phase 2)

---

### Design System Integration

**Component Library**: shadcn/ui (Radix primitives + Tailwind)

**Components to Use**:
- `Form`, `FormField`, `FormLabel`, `FormMessage` (from shadcn/ui)
- `Input`, `Textarea`, `Select`, `RadioGroup`, `Checkbox`
- `Table`, `TableRow`, `TableCell`, `TableHead`
- `Badge` (for category, RSVP status, event-specific badges)
- `Dialog` or `Sheet` (for modal/drawer)
- `Button` (primary, secondary, ghost variants)

**Color Palette** (reference existing theme):
- Primary: #your-brand-color
- Secondary: #...
- Success/Confirmed: Green-600
- Warning/Maybe: Yellow-600
- Error/Declined: Red-600
- Neutral: Gray-500

**Typography**:
- Section headers: Font-semibold, text-lg
- Field labels: Font-medium, text-sm
- Help text: Font-normal, text-xs, text-muted-foreground
- Input text: Font-normal, text-base

---

### Review & Feedback Process

1. **Initial Design Review**: End of Week 1, Day 2
   - Present low-fi wireframes for feedback
   - PM and Frontend Dev review for feasibility

2. **High-Fi Design Review**: End of Week 1, Day 4
   - Present polished mockups with interactions
   - Finalize before frontend implementation starts

3. **Handoff**: End of Week 1, Day 5
   - Export Figma assets
   - Annotate components with measurements, spacing, colors
   - Create interactive prototype for complex interactions
   - Schedule handoff meeting with Frontend Dev

---

## 💻 Backend Developer Handoff

**Recipient:** Backend Development Team
**Phase:** Phase 1 - Event-Type-Specific Fields
**Tech Stack**: Hono, Drizzle ORM, Cloudflare D1, TypeScript

### Technical Requirements

#### 1. Database Schema Updates

**Current Schema** (reference: `backend/src/db/schema/events.ts`):
```typescript
export const guests = sqliteTable('guests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  email: text('email'),
  phone: text('phone'),
  category: text('category', { enum: ['vip', 'family', 'friend', 'colleague', 'other'] }),
  rsvpStatus: text('rsvp_status', { enum: ['pending', 'confirmed', 'declined', 'maybe'] }).default('pending'),
  // ... existing fields
});
```

**New Schema** (add these columns):

```typescript
// Wedding-specific fields
weddingGuestSide: text('wedding_guest_side', {
  enum: ['bride', 'groom', 'both']
}).nullable(),
weddingInvitedTo: text('wedding_invited_to', {
  enum: ['ceremony', 'reception', 'both']
}).nullable().default('both'),
weddingGiftDescription: text('wedding_gift_description'),
weddingGiftThankYouSent: integer('wedding_gift_thank_you_sent', {
  mode: 'boolean'
}).default(false).notNull(),
showerGiftDescription: text('shower_gift_description'),
showerGiftThankYouSent: integer('shower_gift_thank_you_sent', {
  mode: 'boolean'
}).default(false).notNull(),

// Birthday-specific fields
relationshipToBirthdayPerson: text('relationship_to_birthday_person'),
ageGroup: text('age_group', {
  enum: ['child', 'teen', 'adult']
}),
giftContribution: real('gift_contribution'),

// Corporate-specific fields
companyName: text('company_name'),
jobTitle: text('job_title'),
department: text('department'),
attendeeType: text('attendee_type', {
  enum: ['employee', 'client', 'vendor', 'partner']
}).default('employee'),

// Conference-specific fields
badgeType: text('badge_type', {
  enum: ['speaker', 'vip', 'standard', 'press', 'exhibitor', 'staff']
}).default('standard'),
organization: text('organization'),
sessionRegistrations: text('session_registrations'), // JSON array stored as text
specialAccess: integer('special_access', {
  mode: 'boolean'
}).default(false).notNull(),
attendingDays: text('attending_days'), // JSON array stored as text
```

**Migration Script**:
- File: `backend/src/db/migrations/XXXX_add_event_type_guest_fields.sql`
- Use Drizzle migrations: `npm run db:generate`
- Test in local D1: `npm run db:migrate:local`
- Deploy to remote D1: `npm run db:migrate`

**Indexing Strategy**:
```typescript
// Add indexes for frequently filtered fields
export const guests = sqliteTable('guests', {
  // ... fields
}, (table) => ({
  // ... existing indexes
  weddingGuestSideIdx: index('idx_guests_wedding_guest_side').on(table.weddingGuestSide),
  badgeTypeIdx: index('idx_guests_badge_type').on(table.badgeType),
  attendeeTypeIdx: index('idx_guests_attendee_type').on(table.attendeeType),
}));
```

**Type Safety**:
- Update `backend/src/db/types.ts` to export inferred types
- Ensure all enum values are typed (`typeof WEDDING_SIDES[number]`)

#### 2. API Endpoint Updates

**File**: `backend/src/routes/guests.ts`

##### 2.1 Update Validation Schemas

```typescript
// Add to existing enums
const WEDDING_SIDES = ['bride', 'groom', 'both'] as const;
const WEDDING_INVITED_TO = ['ceremony', 'reception', 'both'] as const;
const AGE_GROUPS = ['child', 'teen', 'adult'] as const;
const ATTENDEE_TYPES = ['employee', 'client', 'vendor', 'partner'] as const;
const BADGE_TYPES = ['speaker', 'vip', 'standard', 'press', 'exhibitor', 'staff'] as const;

// Update createGuestSchema
const createGuestSchema = z.object({
  // ... existing fields

  // Wedding fields (optional)
  weddingGuestSide: z.enum(WEDDING_SIDES).optional().nullable(),
  weddingInvitedTo: z.enum(WEDDING_INVITED_TO).optional().nullable(),
  weddingGiftDescription: z.string().max(500).optional().nullable(),
  weddingGiftThankYouSent: z.boolean().optional(),
  showerGiftDescription: z.string().max(500).optional().nullable(),
  showerGiftThankYouSent: z.boolean().optional(),

  // Birthday fields
  relationshipToBirthdayPerson: z.string().max(100).optional().nullable(),
  ageGroup: z.enum(AGE_GROUPS).optional().nullable(),
  giftContribution: z.number().positive().optional().nullable(),

  // Corporate fields
  companyName: z.string().max(200).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  attendeeType: z.enum(ATTENDEE_TYPES).optional().nullable(),

  // Conference fields
  badgeType: z.enum(BADGE_TYPES).optional().nullable(),
  organization: z.string().max(200).optional().nullable(),
  sessionRegistrations: z.array(z.string()).optional().nullable(),
  specialAccess: z.boolean().optional(),
  attendingDays: z.array(z.string()).optional().nullable(),
});

// Update updateGuestSchema similarly
```

##### 2.2 Update GET /events/:eventUuid/guests

**Query Parameters** (add to `listGuestsQuerySchema`):
```typescript
const listGuestsQuerySchema = z.object({
  // ... existing filters

  // Event-type filters
  weddingGuestSide: z.enum(WEDDING_SIDES).optional(),
  badgeType: z.enum(BADGE_TYPES).optional(),
  attendeeType: z.enum(ATTENDEE_TYPES).optional(),
});
```

**Filter Logic**:
```typescript
// In route handler, add conditional filters
if (weddingGuestSide) {
  conditions.push(eq(schema.guests.weddingGuestSide, weddingGuestSide));
}
if (badgeType) {
  conditions.push(eq(schema.guests.badgeType, badgeType));
}
// ... etc
```

**Response** (add new fields to select):
```typescript
const guestsList = await db
  .select({
    // ... existing fields

    // Event-type fields
    weddingGuestSide: schema.guests.weddingGuestSide,
    weddingInvitedTo: schema.guests.weddingInvitedTo,
    weddingGiftDescription: schema.guests.weddingGiftDescription,
    weddingGiftThankYouSent: schema.guests.weddingGiftThankYouSent,
    // ... all other event-type fields
  })
  .from(schema.guests)
  // ... rest of query
```

##### 2.3 Update POST /events/:eventUuid/guests

**Insert Logic**:
```typescript
const [newGuest] = await db
  .insert(schema.guests)
  .values({
    // ... existing fields

    // Wedding fields (only if provided)
    weddingGuestSide: data.weddingGuestSide ?? null,
    weddingInvitedTo: data.weddingInvitedTo ?? null,
    weddingGiftDescription: data.weddingGiftDescription ?? null,
    weddingGiftThankYouSent: data.weddingGiftThankYouSent ?? false,
    showerGiftDescription: data.showerGiftDescription ?? null,
    showerGiftThankYouSent: data.showerGiftThankYouSent ?? false,

    // Birthday fields
    relationshipToBirthdayPerson: data.relationshipToBirthdayPerson ?? null,
    ageGroup: data.ageGroup ?? null,
    giftContribution: data.giftContribution ?? null,

    // Corporate fields
    companyName: data.companyName ?? null,
    jobTitle: data.jobTitle ?? null,
    department: data.department ?? null,
    attendeeType: data.attendeeType ?? null,

    // Conference fields
    badgeType: data.badgeType ?? null,
    organization: data.organization ?? null,
    sessionRegistrations: data.sessionRegistrations ? JSON.stringify(data.sessionRegistrations) : null,
    specialAccess: data.specialAccess ?? false,
    attendingDays: data.attendingDays ? JSON.stringify(data.attendingDays) : null,
  })
  .returning();
```

##### 2.4 Update PATCH /events/:eventUuid/guests/:guestUuid

**Update Logic**:
```typescript
// Build update object dynamically (same pattern as existing code)
if (updates.weddingGuestSide !== undefined) updateData.weddingGuestSide = updates.weddingGuestSide;
if (updates.badgeType !== undefined) updateData.badgeType = updates.badgeType;
// ... for all new fields
```

##### 2.5 Update GET /events/:eventUuid/guests/stats

**Add Event-Type-Specific Stats**:
```typescript
// Example: Count by badge type (conference events)
const badgeTypeStats = await db
  .select({
    badgeType: schema.guests.badgeType,
    count: count(),
  })
  .from(schema.guests)
  .where(baseConditions)
  .groupBy(schema.guests.badgeType);

// Example: Count by wedding side
const weddingSideStats = await db
  .select({
    side: schema.guests.weddingGuestSide,
    count: count(),
  })
  .from(schema.guests)
  .where(baseConditions)
  .groupBy(schema.guests.weddingGuestSide);

// Return in response
return c.json({
  success: true,
  data: {
    // ... existing stats
    byBadgeType: badgeTypeStats, // Only populate if event is conference type
    byWeddingSide: weddingSideStats, // Only populate if event is wedding type
  },
});
```

#### 3. CSV Import/Export Updates

**File**: `backend/src/lib/csv.ts`

##### Update `generateGuestsCsv` Function

Add new columns to CSV export:
```typescript
const headers = [
  'First Name', 'Last Name', 'Email', 'Phone', 'Category', 'RSVP Status',
  'Plus Ones Allowed', 'Dietary Restrictions', 'Notes', 'Checked In',
  // Wedding fields
  'Wedding Guest Side', 'Wedding Invited To', 'Wedding Gift', 'Wedding Gift Thank You Sent',
  'Shower Gift', 'Shower Gift Thank You Sent',
  // Birthday fields
  'Relationship', 'Age Group', 'Gift Contribution',
  // Corporate fields
  'Company', 'Job Title', 'Department', 'Attendee Type',
  // Conference fields
  'Badge Type', 'Organization', 'Special Access', 'Attending Days',
];
```

##### Update `parseGuestsCsv` Function

Add optional fields to CSV parsing:
```typescript
// Map CSV columns to guest fields
const guestData = {
  // ... existing field mappings

  // Event-type fields (optional, default to null if not present)
  weddingGuestSide: row['Wedding Guest Side'] || null,
  weddingGiftDescription: row['Wedding Gift'] || null,
  badgeType: row['Badge Type'] || null,
  // ... etc
};
```

#### 4. Testing Requirements

**Unit Tests** (`backend/src/routes/guests.test.ts`):
- [ ] Test creating guest with wedding fields
- [ ] Test creating guest with conference fields
- [ ] Test filtering by wedding side
- [ ] Test filtering by badge type
- [ ] Test CSV export includes new fields
- [ ] Test CSV import with new fields
- [ ] Test backward compatibility (existing guests without new fields)

**Integration Tests**:
- [ ] Test full CRUD flow for each event type
- [ ] Test migration rollback
- [ ] Test query performance with 1000+ guests

#### 5. Performance Benchmarks

**Queries to Benchmark**:
```sql
-- Baseline (current performance)
SELECT * FROM guests WHERE eventId = ? AND deletedAt IS NULL LIMIT 50;

-- With filters on new fields
SELECT * FROM guests
WHERE eventId = ?
  AND deletedAt IS NULL
  AND weddingGuestSide = 'bride'
LIMIT 50;

-- Aggregations
SELECT badgeType, COUNT(*)
FROM guests
WHERE eventId = ? AND deletedAt IS NULL
GROUP BY badgeType;
```

**Performance Targets**:
- List query: <200ms for 1000 guests
- Filtered query: <250ms for 1000 guests
- Stats query: <300ms for 1000 guests

**Load Testing**:
- Use `wrk` or `artillery` to load test endpoints
- Simulate 100 concurrent users querying guest lists
- Document results in `performance-test-results.md`

#### 6. Error Handling

**Validation Errors**:
```typescript
// Example: Reject invalid enum values gracefully
if (data.badgeType && !BADGE_TYPES.includes(data.badgeType)) {
  return c.json({
    success: false,
    error: {
      code: 'INVALID_BADGE_TYPE',
      message: `Invalid badge type. Must be one of: ${BADGE_TYPES.join(', ')}`,
    },
  }, 400);
}
```

**Migration Errors**:
- If migration fails, log error and roll back
- Notify team via Slack/email
- Document rollback procedure

#### 7. Documentation

**Update API Docs** (`docs/api-spec.md`):
- Document all new guest fields
- Provide example requests for each event type
- Document new query parameters for filters
- Update response schemas

**Code Comments**:
- Add JSDoc comments to new enum constants
- Document field purposes (e.g., "Used for wedding events to track bride vs. groom side")

---

## ⚛️ Frontend Developer Handoff

**Recipient:** Frontend Development Team
**Phase:** Phase 1 - Event-Type-Specific Fields
**Tech Stack**: Astro, React 19, TanStack Query, shadcn/ui, TypeScript

### Technical Requirements

#### 1. Type Definitions

**File**: `frontend/src/hooks/use-guests.ts`

Update `GuestResponse` interface:
```typescript
export interface GuestResponse {
  // ... existing fields

  // Wedding fields
  weddingGuestSide: 'bride' | 'groom' | 'both' | null;
  weddingInvitedTo: 'ceremony' | 'reception' | 'both' | null;
  weddingGiftDescription: string | null;
  weddingGiftThankYouSent: boolean;
  showerGiftDescription: string | null;
  showerGiftThankYouSent: boolean;

  // Birthday fields
  relationshipToBirthdayPerson: string | null;
  ageGroup: 'child' | 'teen' | 'adult' | null;
  giftContribution: number | null;

  // Corporate fields
  companyName: string | null;
  jobTitle: string | null;
  department: string | null;
  attendeeType: 'employee' | 'client' | 'vendor' | 'partner' | null;

  // Conference fields
  badgeType: 'speaker' | 'vip' | 'standard' | 'press' | 'exhibitor' | 'staff' | null;
  organization: string | null;
  sessionRegistrations: string[] | null;
  specialAccess: boolean;
  attendingDays: string[] | null;
}
```

Update `CreateGuestInput`:
```typescript
export interface CreateGuestInput {
  // ... existing fields

  // Add all new fields as optional
  weddingGuestSide?: 'bride' | 'groom' | 'both' | null;
  // ... (all other new fields as optional)
}
```

#### 2. Guest Form Component

**File**: `frontend/src/components/guests/GuestForm.tsx`

##### 2.1 Update Form Schema

```typescript
import { z } from 'zod';

const guestFormSchema = z.object({
  // ... existing fields

  // Wedding fields
  weddingGuestSide: z.enum(['bride', 'groom', 'both']).optional().nullable(),
  weddingInvitedTo: z.enum(['ceremony', 'reception', 'both']).optional().nullable(),
  weddingGiftDescription: z.string().max(500).optional().nullable(),
  weddingGiftThankYouSent: z.boolean().optional(),
  showerGiftDescription: z.string().max(500).optional().nullable(),
  showerGiftThankYouSent: z.boolean().optional(),

  // Birthday fields
  relationshipToBirthdayPerson: z.string().max(100).optional().nullable(),
  ageGroup: z.enum(['child', 'teen', 'adult']).optional().nullable(),
  giftContribution: z.coerce.number().positive().optional().nullable(),

  // Corporate fields
  companyName: z.string().max(200).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  attendeeType: z.enum(['employee', 'client', 'vendor', 'partner']).optional().nullable(),

  // Conference fields
  badgeType: z.enum(['speaker', 'vip', 'standard', 'press', 'exhibitor', 'staff']).optional().nullable(),
  organization: z.string().max(200).optional().nullable(),
  specialAccess: z.boolean().optional(),
  attendingDays: z.array(z.string()).optional().nullable(),
});
```

##### 2.2 Pass Event Context to Form

**Option A: Via Props**
```typescript
interface GuestFormProps {
  // ... existing props
  eventType: 'wedding' | 'birthday' | 'corporate' | 'conference' | 'other';
}

export function GuestForm({ eventType, ...otherProps }: GuestFormProps) {
  // Conditionally render fields based on eventType
}
```

**Option B: Via Context (Recommended)**
```typescript
// Create EventContext
import { createContext, useContext } from 'react';

interface EventContextValue {
  event: {
    uuid: string;
    title: string;
    eventType: 'wedding' | 'birthday' | 'corporate' | 'conference' | 'other';
  };
}

const EventContext = createContext<EventContextValue | null>(null);

export function useEventContext() {
  const context = useContext(EventContext);
  if (!context) throw new Error('useEventContext must be used within EventProvider');
  return context;
}

// In GuestForm
const { event } = useEventContext();
```

##### 2.3 Create Event-Type Field Components

**File**: `frontend/src/components/guests/fields/WeddingFields.tsx`
```typescript
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface WeddingFieldsProps {
  form: UseFormReturn<GuestFormData>;
}

export function WeddingFields({ form }: WeddingFieldsProps) {
  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-md border">
      <h3 className="text-lg font-semibold">Wedding Details</h3>

      {/* Wedding Guest Side */}
      <div className="space-y-2">
        <Label htmlFor="weddingGuestSide">Which side?</Label>
        <RadioGroup
          value={form.watch('weddingGuestSide') ?? ''}
          onValueChange={(value) => form.setValue('weddingGuestSide', value as any)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="bride" id="bride" />
            <Label htmlFor="bride">Bride's Side</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="groom" id="groom" />
            <Label htmlFor="groom">Groom's Side</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="both" id="both" />
            <Label htmlFor="both">Both</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Wedding Gift */}
      <div className="space-y-2">
        <Label htmlFor="weddingGiftDescription">Wedding Gift</Label>
        <Textarea
          id="weddingGiftDescription"
          {...form.register('weddingGiftDescription')}
          placeholder="Describe the wedding gift received..."
          rows={2}
        />
      </div>

      {/* Thank You Sent Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="weddingGiftThankYouSent"
          checked={form.watch('weddingGiftThankYouSent')}
          onCheckedChange={(checked) => form.setValue('weddingGiftThankYouSent', !!checked)}
        />
        <Label htmlFor="weddingGiftThankYouSent">Thank you card sent</Label>
      </div>

      {/* Shower Gift */}
      <div className="space-y-2">
        <Label htmlFor="showerGiftDescription">Shower Gift</Label>
        <Textarea
          id="showerGiftDescription"
          {...form.register('showerGiftDescription')}
          placeholder="Describe the shower gift received..."
          rows={2}
        />
      </div>

      {/* Shower Thank You Sent */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="showerGiftThankYouSent"
          checked={form.watch('showerGiftThankYouSent')}
          onCheckedChange={(checked) => form.setValue('showerGiftThankYouSent', !!checked)}
        />
        <Label htmlFor="showerGiftThankYouSent">Thank you card sent</Label>
      </div>
    </div>
  );
}
```

**Similar Files**:
- `CorporateFields.tsx`
- `ConferenceFields.tsx`
- `BirthdayFields.tsx`

##### 2.4 Conditional Rendering in GuestForm

```typescript
// In GuestForm component
<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
  {/* Existing fields */}
  <div className="grid grid-cols-2 gap-4">
    {/* firstName, lastName, email, phone */}
  </div>

  {/* Event-type-specific fields */}
  {event.eventType === 'wedding' && <WeddingFields form={form} />}
  {event.eventType === 'corporate' && <CorporateFields form={form} />}
  {event.eventType === 'conference' && <ConferenceFields form={form} />}
  {event.eventType === 'birthday' && <BirthdayFields form={form} />}

  {/* Existing fields continue */}
</form>
```

#### 3. Guest Table Component

**File**: `frontend/src/components/guests/GuestTable.tsx`

##### 3.1 Add Dynamic Columns

```typescript
<TableHeader>
  <TableRow>
    <TableHead>Name</TableHead>
    <TableHead>Contact</TableHead>
    <TableHead>Category</TableHead>

    {/* Dynamic event-type columns */}
    {event.eventType === 'wedding' && <TableHead>Side</TableHead>}
    {event.eventType === 'corporate' && <TableHead>Company</TableHead>}
    {event.eventType === 'conference' && <TableHead>Badge</TableHead>}
    {event.eventType === 'birthday' && <TableHead>Relationship</TableHead>}

    <TableHead>RSVP</TableHead>
    <TableHead>Check-in</TableHead>
    <TableHead className="w-[50px]"></TableHead>
  </TableRow>
</TableHeader>

<TableBody>
  {guests.map((guest) => (
    <TableRow key={guest.uuid}>
      <TableCell>{formatName(guest)}</TableCell>
      <TableCell>{/* contact info */}</TableCell>
      <TableCell><GuestCategoryBadge category={guest.category} /></TableCell>

      {/* Dynamic cells */}
      {event.eventType === 'wedding' && (
        <TableCell>
          {guest.weddingGuestSide && <WeddingSideBadge side={guest.weddingGuestSide} />}
        </TableCell>
      )}
      {event.eventType === 'corporate' && (
        <TableCell>{guest.companyName || '—'}</TableCell>
      )}
      {event.eventType === 'conference' && (
        <TableCell>
          {guest.badgeType && <BadgeTypeBadge type={guest.badgeType} />}
        </TableCell>
      )}
      {event.eventType === 'birthday' && (
        <TableCell>{guest.relationshipToBirthdayPerson || '—'}</TableCell>
      )}

      {/* Existing cells */}
    </TableRow>
  ))}
</TableBody>
```

##### 3.2 Create Badge Components

**File**: `frontend/src/components/guests/WeddingSideBadge.tsx`
```typescript
import { Badge } from '@/components/ui/badge';

interface WeddingSideBadgeProps {
  side: 'bride' | 'groom' | 'both';
}

export function WeddingSideBadge({ side }: WeddingSideBadgeProps) {
  const variants = {
    bride: { label: "Bride's Side", className: 'bg-pink-100 text-pink-700 hover:bg-pink-200' },
    groom: { label: "Groom's Side", className: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    both: { label: 'Both', className: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
  };

  const { label, className } = variants[side];

  return <Badge className={className}>{label}</Badge>;
}
```

**Similar Badge Components**:
- `BadgeTypeBadge.tsx` (conference badge types with distinct colors)
- `AttendeeTypeBadge.tsx` (corporate attendee types)

##### 3.3 Add Filters for Event-Type Fields

**File**: `frontend/src/components/guests/GuestFilters.tsx` (create new component)
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface GuestFiltersProps {
  eventType: string;
  filters: {
    category?: string;
    rsvpStatus?: string;
    weddingGuestSide?: string;
    badgeType?: string;
  };
  onFilterChange: (key: string, value: string | undefined) => void;
}

export function GuestFilters({ eventType, filters, onFilterChange }: GuestFiltersProps) {
  return (
    <div className="flex gap-4 items-end">
      {/* Existing filters */}
      <div>
        <Label>Category</Label>
        <Select value={filters.category} onValueChange={(v) => onFilterChange('category', v)}>
          {/* options */}
        </Select>
      </div>

      {/* Event-type-specific filters */}
      {eventType === 'wedding' && (
        <div>
          <Label>Guest Side</Label>
          <Select value={filters.weddingGuestSide} onValueChange={(v) => onFilterChange('weddingGuestSide', v)}>
            <SelectTrigger>
              <SelectValue placeholder="All sides" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sides</SelectItem>
              <SelectItem value="bride">Bride's Side</SelectItem>
              <SelectItem value="groom">Groom's Side</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {eventType === 'conference' && (
        <div>
          <Label>Badge Type</Label>
          <Select value={filters.badgeType} onValueChange={(v) => onFilterChange('badgeType', v)}>
            {/* badge type options */}
          </Select>
        </div>
      )}
    </div>
  );
}
```

#### 4. TanStack Query Integration

**File**: `frontend/src/hooks/use-guests.ts`

Update `ListGuestsQuery` interface:
```typescript
export interface ListGuestsQuery {
  // ... existing
  weddingGuestSide?: 'bride' | 'groom' | 'both';
  badgeType?: 'speaker' | 'vip' | 'standard' | 'press' | 'exhibitor' | 'staff';
  attendeeType?: 'employee' | 'client' | 'vendor' | 'partner';
}
```

Update `useGuests` hook to include new filters:
```typescript
export function useGuests(
  eventUuid: string,
  filters?: Partial<ListGuestsQuery>,
  options?: UseGuestsOptions
) {
  return useQuery<GuestsQueryResult>({
    queryKey: guestKeys.list(eventUuid, filters),
    queryFn: async (): Promise<GuestsQueryResult> => {
      const params = new URLSearchParams();
      // ... existing params

      // New filter params
      if (filters?.weddingGuestSide) params.set('weddingGuestSide', filters.weddingGuestSide);
      if (filters?.badgeType) params.set('badgeType', filters.badgeType);
      if (filters?.attendeeType) params.set('attendeeType', filters.attendeeType);

      const url = `${API_URL}/events/${eventUuid}/guests${params.toString() ? `?${params}` : ''}`;
      // ... rest of implementation
    },
    // ... options
  });
}
```

#### 5. Testing Requirements

**Component Tests** (Vitest + React Testing Library):
- [ ] Test GuestForm renders wedding fields for wedding events
- [ ] Test GuestForm does NOT render wedding fields for corporate events
- [ ] Test form validation for new fields
- [ ] Test badge components render correct colors/labels
- [ ] Test filter UI updates query params correctly

**Example Test**:
```typescript
// GuestForm.test.tsx
import { render, screen } from '@testing-library/react';
import { GuestForm } from './GuestForm';
import { EventContext } from '@/contexts/EventContext';

describe('GuestForm', () => {
  it('renders wedding fields when event type is wedding', () => {
    const eventContext = {
      event: { uuid: '123', title: 'My Wedding', eventType: 'wedding' as const },
    };

    render(
      <EventContext.Provider value={eventContext}>
        <GuestForm {...props} />
      </EventContext.Provider>
    );

    expect(screen.getByText('Wedding Details')).toBeInTheDocument();
    expect(screen.getByLabelText('Which side?')).toBeInTheDocument();
  });

  it('does NOT render wedding fields for corporate events', () => {
    const eventContext = {
      event: { uuid: '123', title: 'Corp Event', eventType: 'corporate' as const },
    };

    render(
      <EventContext.Provider value={eventContext}>
        <GuestForm {...props} />
      </EventContext.Provider>
    );

    expect(screen.queryByText('Wedding Details')).not.toBeInTheDocument();
  });
});
```

#### 6. Accessibility Requirements

- [ ] All form fields have associated labels (`<Label>` component)
- [ ] Radio groups use proper ARIA attributes
- [ ] Error messages are announced by screen readers
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Focus visible on all interactive elements
- [ ] Color contrast meets WCAG AA (4.5:1 for text)

#### 7. Performance Considerations

- [ ] Use `React.memo` for badge components (avoid re-renders)
- [ ] Lazy load event-type field components if bundle size is large
- [ ] Debounce search input (already implemented)
- [ ] Virtualize table rows if >100 guests (consider `@tanstack/react-virtual`)

---

## 📊 Success Tracking & Metrics

**Responsibility:** Product Manager + Data Analyst

### Analytics Events to Track

**Mixpanel Events**:
```javascript
// When user configures event type during event creation
mixpanel.track('Event Created', {
  eventType: 'wedding',
  hasGuests: false,
});

// When user adds guest with event-specific fields
mixpanel.track('Guest Added', {
  eventType: 'wedding',
  hasEventSpecificFields: true,
  fieldsUsed: ['weddingGuestSide', 'weddingGiftDescription'],
});

// When user filters guests by event-specific field
mixpanel.track('Guest List Filtered', {
  eventType: 'wedding',
  filterType: 'weddingGuestSide',
  filterValue: 'bride',
});

// When user exports CSV
mixpanel.track('Guests Exported', {
  eventType: 'wedding',
  guestCount: 150,
});
```

**Implementation**:
- Add Mixpanel snippet to `frontend/src/layouts/BaseLayout.astro`
- Create utility function `frontend/src/lib/analytics.ts` for event tracking
- Ensure GDPR compliance (user consent)

### Dashboards to Create

**Grafana Dashboard** (Performance Metrics):
- P95 response time for guest list queries
- Error rate for guest API endpoints
- Database query duration (by query type)
- Cache hit rate for TanStack Query

**Mixpanel Dashboard** (Usage Metrics):
- Event type distribution (pie chart)
- Field configuration rate (% events with event-specific fields filled)
- Feature adoption over time (line chart)
- User segmentation: power users vs. casual users

---

## 🚀 Launch Coordination

**Responsibility:** Product Manager + DevOps

### Pre-Launch Checklist

**1 Week Before Launch**:
- [ ] Staging environment deployed and tested
- [ ] Load testing completed (1000+ guests)
- [ ] User acceptance testing (10 beta users)
- [ ] Documentation completed (help center articles)
- [ ] Marketing assets prepared (announcement email, blog post)
- [ ] Rollback plan documented and rehearsed

**Launch Day**:
- [ ] Deploy to production during low-traffic window (e.g., 8am PST Tuesday)
- [ ] Monitor error rates for 2 hours post-deploy
- [ ] Send announcement email to users (batch 1: 10% of users)
- [ ] Post announcement in app (banner or modal)
- [ ] Monitor support tickets and Slack channels

**Post-Launch (Week 1)**:
- [ ] Daily metric reviews (error rates, adoption, performance)
- [ ] Respond to support tickets within 4 hours
- [ ] Ship hotfixes for critical bugs within 24 hours
- [ ] Collect user feedback (NPS survey, interviews)
- [ ] Document lessons learned

### Rollback Plan

**If Critical Bug Detected**:
1. Immediately notify team via Slack #incidents channel
2. Stop processing guest writes (read-only mode)
3. Run rollback script: `npm run db:rollback`
4. Deploy previous version of backend: `npm run deploy:rollback`
5. Deploy previous version of frontend: `git revert && npm run deploy`
6. Communicate status to users via status page
7. Post-mortem within 48 hours

---

## 📞 Points of Contact

**Product Manager**: [Your Name]
**Backend Lead**: [Backend Dev Name]
**Frontend Lead**: [Frontend Dev Name]
**Designer**: [Designer Name]
**DevOps**: [DevOps Name]
**QA Lead**: [QA Name]

**Meeting Cadence**:
- Daily standup: 10am PST (15 min)
- Design review: Week 1, Day 2 @ 2pm PST
- Sprint review: Week 3, Day 5 @ 3pm PST
- Retrospective: Week 3, Day 5 @ 4pm PST

---

## Appendix: Data Dictionary

### Event-Type-Specific Fields

| Field Name | Event Type | Data Type | Example Values | Notes |
|------------|------------|-----------|----------------|-------|
| weddingGuestSide | Wedding | Enum | bride, groom, both | For seating and gift tracking |
| weddingInvitedTo | Wedding | Enum | ceremony, reception, both | Controls what guest is invited to |
| weddingGiftDescription | Wedding | Text | "Crystal vase from Pottery Barn" | Free-form text, max 500 chars |
| weddingGiftThankYouSent | Wedding | Boolean | true, false | Track if thank you card sent |
| showerGiftDescription | Wedding | Text | "Kitchen towel set" | Free-form text, max 500 chars |
| showerGiftThankYouSent | Wedding | Boolean | true, false | Track if thank you card sent |
| relationshipToBirthdayPerson | Birthday | Text | "Cousin", "Coworker" | Free-form, max 100 chars |
| ageGroup | Birthday | Enum | child, teen, adult | For activity planning |
| giftContribution | Birthday | Number | 25.00 | Track group gift contributions |
| companyName | Corporate | Text | "Acme Corp" | Max 200 chars |
| jobTitle | Corporate | Text | "Software Engineer" | Max 100 chars |
| department | Corporate | Text | "Engineering" | Max 100 chars |
| attendeeType | Corporate | Enum | employee, client, vendor, partner | For badge printing |
| badgeType | Conference | Enum | speaker, vip, standard, press, exhibitor, staff | Controls access levels |
| organization | Conference | Text | "TechCorp Inc." | Max 200 chars |
| sessionRegistrations | Conference | JSON Array | ["session-1", "session-2"] | List of session IDs |
| specialAccess | Conference | Boolean | true, false | VIP lounge, backstage, etc. |
| attendingDays | Conference | JSON Array | ["Day1", "Day2"] | For multi-day events |

---

**End of Team Handoffs Document**

Next Steps:
1. Schedule kickoff meeting with all team members
2. Designer begins work on mockups (Week 1, Day 1)
3. Backend Dev sets up feature branch and migration (Week 1, Day 1)
4. Frontend Dev reviews design system and prepares component structure (Week 1, Day 2)
5. Daily standups to track progress and unblock issues
