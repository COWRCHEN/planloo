# Guest Fields System - Requirements Document

**Project:** Planloo Event Planning SaaS
**Feature:** Flexible Guest Fields System
**Document Owner:** Product Manager
**Last Updated:** 2026-02-05
**Status:** Planning Phase

---

## Executive Summary

This document defines requirements for implementing a flexible guest fields system that adapts to different event types while maintaining user-configurability. The system will replace the current one-size-fits-all guest schema with a hybrid approach supporting both structured event-type-specific fields and user-defined custom fields.

---

## Problem Statement

### Current Limitations
1. **Event-Type Agnostic**: All events (wedding, birthday, corporate, conference) share identical guest fields
2. **Inflexible Schema**: Cannot capture event-specific information (e.g., bride/groom side for weddings, badge type for conferences)
3. **No Field Configuration**: Users cannot enable/disable optional fields per event
4. **Poor UX**: Forms show all fields regardless of relevance
5. **Limited Scalability**: Adding new event types requires backend schema changes

### Business Impact
- Users manually track specialized information in notes/external systems
- Lower perceived value for event-specific use cases
- Competitive disadvantage against specialized tools (wedding-only, corporate-only apps)
- Lost cross-sell opportunities across event types

---

## User Stories

### Priority 1: Event-Type-Specific Fields

**US-1.1: Wedding Organizer - Track Guest Sides**
```
As a wedding organizer,
I want to categorize guests by bride/groom side,
So that I can balance seating and track relationships.

Acceptance Criteria:
- Field appears only for wedding event types
- Options: Bride's Side, Groom's Side, Both
- Visible in guest list with filterable badge
- Exportable to CSV
```

**US-1.2: Wedding Organizer - Gift Tracking**
```
As a wedding organizer,
I want to record wedding and shower gifts received,
So that I can send appropriate thank you cards.

Acceptance Criteria:
- Separate fields for wedding gift and shower gift descriptions
- Checkbox to mark thank you card sent for each gift type
- Visible in guest detail view
- Filterable: show guests who need thank you cards
```

**US-1.3: Conference Organizer - Badge Management**
```
As a conference organizer,
I want to assign badge types to attendees,
So that I can control access levels and track registration tiers.

Acceptance Criteria:
- Field appears only for conference event types
- Configurable badge types (e.g., Speaker, VIP, Standard, Press, Exhibitor)
- Visible in check-in interface
- Stats dashboard shows breakdown by badge type
```

**US-1.4: Corporate Event Organizer - Company Information**
```
As a corporate event organizer,
I want to track attendee company and job details,
So that I can create proper name badges and facilitate networking.

Acceptance Criteria:
- Fields: Company Name, Job Title, Department
- Visible in guest list and detail views
- Searchable by company name
- Exportable for badge printing
```

### Priority 2: User-Configurable Fields

**US-2.1: Event Organizer - Toggle Address Collection**
```
As an event organizer,
I want to enable/disable address collection per event,
So that I only collect information I need for invitations.

Acceptance Criteria:
- Event settings page has field configuration section
- When disabled, address fields hidden in guest form and RSVP
- When enabled, address fields appear (Street, City, State, Zip, Country)
- Setting persists per event
- Does not affect existing guest data
```

**US-2.2: Event Organizer - Configure Meal Options**
```
As an event organizer,
I want to customize meal choice options,
So that they match my caterer's menu.

Acceptance Criteria:
- Default options: Option 1, Option 2, Vegetarian, Child Meal
- Can rename each option (e.g., "Beef", "Chicken", "Vegan")
- Can enable/disable meal selection entirely
- Meal stats visible in dashboard
- RSVP form shows configured options
```

**US-2.3: Event Organizer - Accommodation Tracking**
```
As an event organizer,
I want to track out-of-town guest accommodation,
So that I can recommend hotels and provide transportation.

Acceptance Criteria:
- Toggle to enable accommodation tracking
- Event defines the hotel list (name + optional structured address: street no., street, city, state, zip, country)
- Guest fields: Needs Accommodation (Y/N), Hotel (selected from event list), Check-in Date, Check-out Date, Room number
- Visible only when enabled
- Filterable: show guests needing accommodation
- Exportable for hotel block management
```

### Priority 3: Custom Fields (Future)

**US-3.1: Power User - Define Custom Fields**
```
As a power user with unique requirements,
I want to create custom fields for my event,
So that I can track information specific to my use case.

Acceptance Criteria:
- Create up to 10 custom fields per event
- Field types: Text, Number, Single-Select, Multi-Select, Date, Checkbox
- Specify field label and help text
- Mark field as required/optional
- Custom fields appear in guest form and RSVP
- Searchable and exportable
```

---

## Functional Requirements

### FR-1: Event-Type-Specific Field Definitions

#### FR-1.1: Wedding Event Fields
| Field Name | Type | Options | Required | Notes |
|------------|------|---------|----------|-------|
| weddingGuestSide | Enum | Bride, Groom, Both | No | Defaults to null |
| weddingInvitedTo | Enum | Ceremony, Reception, Both | No | Defaults to "Both" |
| weddingGiftDescription | Text | - | No | Max 500 chars |
| weddingGiftThankYouSent | Boolean | - | No | Defaults to false |
| showerGiftDescription | Text | - | No | Max 500 chars |
| showerGiftThankYouSent | Boolean | - | No | Defaults to false |

#### FR-1.2: Birthday Event Fields
| Field Name | Type | Options | Required | Notes |
|------------|------|---------|----------|-------|
| relationshipToBirthdayPerson | Text | - | No | Max 100 chars (e.g., "Friend", "Cousin") |
| ageGroup | Enum | Child, Teen, Adult | No | For planning appropriate activities |
| giftContribution | Number | - | No | Track group gift contributions |

#### FR-1.3: Corporate Event Fields
| Field Name | Type | Options | Required | Notes |
|------------|------|---------|----------|-------|
| companyName | Text | - | No | Max 200 chars |
| jobTitle | Text | - | No | Max 100 chars |
| department | Text | - | No | Max 100 chars |
| attendeeType | Enum | Employee, Client, Vendor, Partner | No | Defaults to "Employee" |

#### FR-1.4: Conference Event Fields
| Field Name | Type | Options | Required | Notes |
|------------|------|---------|----------|-------|
| badgeType | Enum | Speaker, VIP, Standard, Press, Exhibitor, Staff | Yes | Defaults to "Standard" |
| organization | Text | - | No | Max 200 chars |
| sessionRegistrations | JSON | - | No | Array of session IDs |
| specialAccess | Boolean | - | No | VIP lounge, backstage, etc. |
| attendingDays | Multi-Enum | Day1, Day2, Day3 | No | For multi-day events |

#### FR-1.5: Other Event Fields
- No event-specific fields
- Falls back to common fields only
- User can leverage custom fields for flexibility

### FR-2: User-Configurable Common Fields

All event types can configure these optional field sets:

#### FR-2.1: Address Fields (Toggle: enableAddressCollection)
| Field Name | Type | Required When Enabled | Notes |
|------------|------|----------------------|-------|
| addressStreet | Text | No | Max 200 chars |
| addressCity | Text | No | Max 100 chars |
| addressState | Text | No | Max 100 chars |
| addressZipCode | Text | No | Max 20 chars |
| addressCountry | Text | No | Max 100 chars, defaults to "USA" |

#### FR-2.2: Meal Choice Fields (Toggle: enableMealSelection)
| Field Name | Type | Configuration | Notes |
|------------|------|---------------|-------|
| mealChoice | Enum | User-defined labels | Defaults: Option1, Option2, Vegetarian, Child |
| mealChoiceOptions | JSON | - | Stored in eventSettings |

#### FR-2.3: Accommodation Fields (Toggle: enableAccommodation)
| Field Name | Type | Required When Enabled | Notes |
|------------|------|----------------------|-------|
| needsAccommodation | Boolean | No | Defaults to false |
| hotelName | Text | No | Selected from event-defined hotel list (not free text) |
| checkInDate | Date | No | - |
| checkOutDate | Date | No | Must be after checkInDate |

Event-level configuration (in Event Settings → Guest Fields → Accommodation): organizer defines the hotel list. Each hotel has **name** and optional **structured address** (street no., street, city, state, zip, country). See [Accommodation feature](../Accommodation/README.md).

#### FR-2.4: Additional Optional Fields (Individual Toggles)
| Field Name | Toggle Setting | Type | Notes |
|------------|----------------|------|-------|
| plusOneName | enablePlusOneNames | Text | Max 100 chars |
| tableAssignment | enableTableAssignments | Text | Max 50 chars (e.g., "Table 5") |
| transportationNeeded | enableTransportation | Boolean | Airport pickup, shuttles |
| accessibilityNeeds | enableAccessibility | Text | Max 500 chars |

### FR-3: Field Configuration UI

#### FR-3.1: Event Settings Page
```
Location: /dashboard/events/:uuid/settings
Tab: "Guest Fields"

Sections:
1. Event-Type Fields (Read-only info box)
   - Shows which special fields are available for this event type
   - Cannot be disabled (part of event type value prop)

2. Optional Common Fields
   - Checkbox toggles for each field set:
     [ ] Collect Guest Addresses
     [ ] Enable Meal Selection
         └─ Configure meal options (button opens modal)
     [ ] Track Accommodation Needs
     [ ] Collect Plus-One Names
     [ ] Enable Table Assignments
     [ ] Track Transportation Needs
     [ ] Collect Accessibility Needs

3. Custom Fields (Future - Phase 2)
   - "Add Custom Field" button
   - List of created custom fields with edit/delete
```

#### FR-3.2: Guest Form Dynamic Rendering
- Form sections appear/disappear based on configuration
- Event-type fields always visible (if applicable)
- Enabled optional fields render after core fields
- Custom fields render at end
- Field validation adjusts based on configuration

### FR-4: Data Management

#### FR-4.1: Backward Compatibility
- Existing guests retain all current field data
- New field columns allow NULL values
- Changing event type does not delete existing field data (but may hide it)
- Export CSV includes all fields (empty for non-applicable)

#### FR-4.2: Field Visibility Rules
```typescript
// Pseudocode for field visibility logic
function getVisibleFields(event: Event, guest: Guest): FieldConfig[] {
  const fields: FieldConfig[] = [...COMMON_REQUIRED_FIELDS];

  // Add event-type-specific fields
  fields.push(...EVENT_TYPE_FIELD_MAP[event.eventType] || []);

  // Add enabled optional fields
  if (event.settings.enableAddressCollection) {
    fields.push(...ADDRESS_FIELDS);
  }
  if (event.settings.enableMealSelection) {
    fields.push(MEAL_CHOICE_FIELD);
  }
  // ... etc for each optional field set

  // Add custom fields
  fields.push(...event.customFields || []);

  return fields;
}
```

#### FR-4.3: Search and Filtering
- Search includes all visible text fields
- Filters available for enum fields (category, RSVP status, event-specific enums)
- "Advanced Filters" button reveals event-type-specific filters

---

## Non-Functional Requirements

### NFR-1: Performance
- Field configuration changes take effect immediately (no rebuild)
- Guest list queries maintain <200ms response time with 1000+ guests
- CSV export completes in <5 seconds for 1000 guests

### NFR-2: Data Integrity
- Field data persists even when fields are disabled
- No data loss when changing event types
- Validation prevents invalid data entry

### NFR-3: Usability
- Forms show only relevant fields (avoid clutter)
- Clear visual distinction between required/optional fields
- Help text explains event-specific fields
- Mobile-responsive design for all forms

### NFR-4: Scalability
- Support up to 5000 guests per event
- Support up to 10 custom fields per event
- Efficient indexing for filterable fields

---

## Success Metrics

### Adoption Metrics
- **Field Configuration Rate**: % of events that customize field settings
  - Target: 40% of events configure at least one optional field
- **Event-Type Usage**: Distribution across event types
  - Target: >60% of new events use specialized types (not "other")

### Engagement Metrics
- **Form Completion Rate**: % of RSVP forms completed
  - Target: Increase from current baseline by 10%
- **Data Completeness**: % of optional fields filled when enabled
  - Target: >50% completion rate for enabled optional fields

### Satisfaction Metrics
- **NPS Impact**: Change in Net Promoter Score after launch
  - Target: +5 point increase
- **Feature Request Reduction**: Decrease in custom field feature requests
  - Target: 50% reduction in Canny votes for "custom fields"

---

## Open Questions

1. **Custom Field Limits**: Should Pro/Premium tiers get more custom fields?
2. **Field Reordering**: Should users control field order in forms?
3. **Conditional Logic**: Should fields show/hide based on other field values? (e.g., show hotel fields only if "Needs Accommodation" is Yes)
4. **Field History**: Should we track when field configurations change?
5. **Template System**: Should users save field configurations as templates for reuse?
6. **Import Mapping**: How do users map CSV columns to custom fields during import?

---

## Out of Scope (This Phase)

- Formula fields (calculated values)
- Field-level permissions (show to organizers only, hide from guests)
- API access to custom field definitions
- Field validation rules (regex, min/max for text fields)
- Conditional field logic
- Field dependency rules
- Multi-language field labels
- Field change audit logs

---

## Dependencies

### Technical Dependencies
- Database migration system (Drizzle ORM)
- JSON column support in D1/SQLite
- Frontend form library (react-hook-form) with dynamic field support
- shadcn/ui components for UI consistency

### Team Dependencies
- **Designer**: Field configuration UI/UX design
- **Backend Developer**: Schema design, migration strategy, API updates
- **Frontend Developer**: Dynamic form rendering, field configuration UI
- **DevOps**: Database migration coordination, performance testing

### External Dependencies
- None identified

---

## References

- Current Guest Schema: `backend/src/db/schema/events.ts`
- Guest API Routes: `backend/src/routes/guests.ts`
- Guest Form Component: `frontend/src/components/guests/GuestForm.tsx`
- Similar Products Analysis: [Link to competitor analysis doc]
- User Feedback: [Link to Canny feedback threads]
