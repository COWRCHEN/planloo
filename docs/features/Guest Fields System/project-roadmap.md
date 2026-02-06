# Guest Fields System - Project Roadmap

**Project:** Planloo Event Planning SaaS
**Feature:** Flexible Guest Fields System
**Document Owner:** Product Manager
**Last Updated:** 2026-02-05
**Status:** Planning Phase

---

## Overview

This roadmap outlines the phased implementation of a flexible guest fields system across three development phases. The approach balances user value delivery with technical complexity, prioritizing quick wins while building toward a fully flexible system.

---

## Strategic Approach

### Design Philosophy
1. **Progressive Enhancement**: Start with structured fields, evolve to full customization
2. **Event-Type Value**: Prioritize event-specific fields that differentiate us from generic tools
3. **User Control**: Give organizers configuration power without overwhelming them
4. **Data Safety**: Never lose data, even when fields are disabled or event types change
5. **Performance First**: Maintain fast queries even with flexible schemas

### Risk Mitigation
- **Database Migration Risk**: Thorough testing in staging, rollback plan prepared
- **Performance Risk**: Index strategy planned, query performance benchmarks established
- **UX Complexity Risk**: Phased rollout with user testing between phases
- **Data Integrity Risk**: Comprehensive validation, backward compatibility tests

---

## Phase 1: Event-Type-Specific Fields (MVP)

**Goal**: Ship event-type differentiation with high-impact specialized fields
**Timeline**: 3 weeks
**Team**: 1 Backend Dev, 1 Frontend Dev, 1 Designer

### Scope

#### Features Included
✅ Wedding-specific fields (guest side, invited to, gift tracking)
✅ Corporate-specific fields (company, job title, department)
✅ Conference-specific fields (badge type, organization)
✅ Birthday-specific fields (relationship, age group)
✅ Updated guest form with event-type-aware field rendering
✅ CSV export with all new fields
✅ Search and filter for new enum fields

#### Features Excluded
❌ User-configurable fields (Phase 2)
❌ Custom fields (Phase 3)
❌ Field reordering
❌ Conditional field logic
❌ Field configuration UI (fields always enabled in Phase 1)

### Week-by-Week Breakdown

#### Week 1: Foundation (Backend Focus)

**Backend Tasks**
- [ ] **Task 1.1**: Design final database schema
  - Add event-type-specific columns to `guests` table
  - Create indexes for filterable enum fields
  - Write migration script
  - Effort: 1 day

- [ ] **Task 1.2**: Update Drizzle schema and types
  - Modify `backend/src/db/schema/events.ts`
  - Regenerate types
  - Update API response types
  - Effort: 0.5 days

- [ ] **Task 1.3**: Run migrations in local and staging
  - Test migration rollback
  - Verify data integrity
  - Check query performance
  - Effort: 0.5 days

- [ ] **Task 1.4**: Update guest API endpoints
  - Modify POST /guests (create)
  - Modify PATCH /guests/:uuid (update)
  - Update GET /guests (list) with new filters
  - Update validation schemas
  - Effort: 1 day

- [ ] **Task 1.5**: Update CSV export logic
  - Add new fields to export function
  - Update CSV column headers
  - Test with sample data
  - Effort: 0.5 days

**Frontend Tasks**
- [ ] **Task 1.6**: Update TypeScript types
  - Sync with new API response shape
  - Update `use-guests.ts` hook types
  - Effort: 0.5 days

- [ ] **Task 1.7**: Create event-type field mapping config
  - Define field visibility rules per event type
  - Create reusable field component library
  - Effort: 1 day

**Design Tasks**
- [ ] **Task 1.8**: Design updated guest form
  - Field grouping strategy (visual sections)
  - Event-type-specific field styling
  - Help text and labels
  - Mobile responsiveness
  - Deliverable: Figma mockups
  - Effort: 2 days

**Dependencies**: Task 1.4 requires 1.1-1.3 complete. Task 1.7 requires 1.6 complete.

#### Week 2: UI Implementation (Frontend Focus)

**Frontend Tasks**
- [ ] **Task 2.1**: Refactor GuestForm component
  - Implement dynamic field rendering based on event type
  - Add validation for new fields
  - Update form schema definitions
  - Effort: 2 days

- [ ] **Task 2.2**: Create event-type-specific field components
  - `WeddingFieldsSection.tsx`
  - `CorporateFieldsSection.tsx`
  - `ConferenceFieldsSection.tsx`
  - `BirthdayFieldsSection.tsx`
  - Effort: 1.5 days

- [ ] **Task 2.3**: Update GuestTable for new fields
  - Add columns for key event-specific fields
  - Implement field-based filtering UI
  - Update search to include new fields
  - Effort: 1 day

- [ ] **Task 2.4**: Create badge components
  - `GuestSideBadge.tsx` (bride/groom)
  - `BadgeTypeBadge.tsx` (conference)
  - `AttendeeTypeBadge.tsx` (corporate)
  - Effort: 0.5 days

**Backend Tasks**
- [ ] **Task 2.5**: Performance testing
  - Load test guest list queries with 1000+ guests
  - Optimize indexes if needed
  - Document query performance
  - Effort: 0.5 days

**Design Tasks**
- [ ] **Task 2.6**: Design guest list table updates
  - New column layouts
  - Filter UI design
  - Badge visual design
  - Deliverable: Figma mockups
  - Effort: 1 day

**Dependencies**: Task 2.1-2.4 require Task 1.8 design approved.

#### Week 3: Polish, Testing & Launch

**Frontend Tasks**
- [ ] **Task 3.1**: CSV import updates
  - Update CSV template with new fields
  - Add field mapping validation
  - Test import with various formats
  - Effort: 1 day

- [ ] **Task 3.2**: Guest detail view updates
  - Show all relevant event-specific fields
  - Update edit modal
  - Effort: 0.5 days

- [ ] **Task 3.3**: RSVP form updates
  - Render event-specific fields in public RSVP form
  - Update RSVP submission logic
  - Effort: 1 day

**Testing & QA Tasks**
- [ ] **Task 3.4**: Cross-browser testing
  - Chrome, Firefox, Safari, Edge
  - Mobile Safari, Chrome Mobile
  - Effort: 0.5 days

- [ ] **Task 3.5**: End-to-end testing
  - Create guests for each event type
  - Test all CRUD operations
  - Test CSV import/export
  - Test RSVP submission
  - Effort: 1 day

- [ ] **Task 3.6**: Data migration validation
  - Verify existing guests unaffected
  - Test event type changes
  - Verify backward compatibility
  - Effort: 0.5 days

**Documentation Tasks**
- [ ] **Task 3.7**: Update user documentation
  - Field descriptions for each event type
  - CSV import template documentation
  - Help center articles
  - Effort: 1 day

- [ ] **Task 3.8**: API documentation
  - Update API docs with new fields
  - Add examples for each event type
  - Effort: 0.5 days

**Launch Tasks**
- [ ] **Task 3.9**: Staging deployment and smoke tests
- [ ] **Task 3.10**: Production deployment
- [ ] **Task 3.11**: Monitor error rates and performance
- [ ] **Task 3.12**: Announce feature to users (email, in-app)

**Dependencies**: All launch tasks require all other Phase 1 tasks complete.

### Phase 1 Deliverables

1. ✅ Database schema with event-type-specific columns
2. ✅ Migrated production database
3. ✅ Updated guest API with new fields
4. ✅ Dynamic guest form component
5. ✅ Event-type-aware guest table
6. ✅ CSV import/export with new fields
7. ✅ Updated documentation
8. ✅ Performance test results

### Phase 1 Success Criteria

- [ ] All 5 event types have differentiated guest fields
- [ ] Guest form dynamically renders fields based on event type
- [ ] CSV export includes all new fields
- [ ] Search and filters work for new enum fields
- [ ] Query performance <200ms for 1000 guests
- [ ] Zero data loss for existing guests
- [ ] Zero production incidents in first week
- [ ] >90% of test users successfully add event-specific guest info

---

## Phase 2: User-Configurable Common Fields

**Goal**: Give users control over optional field visibility
**Timeline**: 2 weeks
**Team**: 1 Backend Dev, 1 Frontend Dev, 1 Designer

### Scope

#### Features Included
✅ Event settings page with field configuration UI
✅ Toggle controls for optional field sets (address, meal, accommodation, etc.)
✅ Meal choice label customization
✅ Dynamic form rendering based on configuration
✅ Field configuration stored in `eventSettings` JSON column
✅ Updated RSVP form respecting field configuration

#### Features Excluded
❌ Custom user-defined fields (Phase 3)
❌ Field reordering
❌ Conditional field logic
❌ Field templates

### Week-by-Week Breakdown

#### Week 1: Backend + Settings UI

**Backend Tasks**
- [ ] **Task 2.1.1**: Add `eventSettings` JSON column
  - Create migration to add column to `events` table
  - Define TypeScript types for settings schema
  - Effort: 0.5 days

- [ ] **Task 2.1.2**: Add optional field columns
  - Add address fields, meal choice, accommodation fields, etc.
  - Create indexes for searchable fields
  - Effort: 1 day

- [ ] **Task 2.1.3**: Create event settings API endpoints
  - GET /events/:uuid/settings
  - PATCH /events/:uuid/settings
  - Validation for settings schema
  - Effort: 1 day

- [ ] **Task 2.1.4**: Update guest API validation
  - Dynamic validation based on event settings
  - Required field logic
  - Effort: 0.5 days

**Frontend Tasks**
- [ ] **Task 2.1.5**: Create EventSettingsPage component
  - Event settings navigation tab
  - Field configuration section
  - Effort: 1 day

- [ ] **Task 2.1.6**: Build field configuration UI
  - Toggle switches for each optional field set
  - Meal choice configuration modal
  - Save/cancel buttons with loading states
  - Effort: 1.5 days

**Design Tasks**
- [ ] **Task 2.1.7**: Design event settings page
  - Tab navigation design
  - Field toggle UI
  - Meal configuration modal
  - Deliverable: Figma mockups
  - Effort: 2 days

#### Week 2: Dynamic Forms + Testing

**Frontend Tasks**
- [ ] **Task 2.2.1**: Update GuestForm with dynamic fields
  - Read event settings from context/props
  - Conditionally render optional field sections
  - Update validation schema dynamically
  - Effort: 2 days

- [ ] **Task 2.2.2**: Update RSVP form
  - Fetch event settings in RSVP page
  - Render only enabled fields
  - Effort: 1 day

- [ ] **Task 2.2.3**: Update guest table
  - Show/hide columns based on settings
  - Update filters
  - Effort: 0.5 days

**Testing & QA Tasks**
- [ ] **Task 2.2.4**: End-to-end testing
  - Test all field toggle combinations
  - Test meal choice customization
  - Test form validation with different configurations
  - Test RSVP submission
  - Effort: 1 day

- [ ] **Task 2.2.5**: User acceptance testing
  - Recruit 10 beta users
  - Observe configuration workflow
  - Collect feedback
  - Effort: 1 day (ongoing)

**Launch Tasks**
- [ ] **Task 2.2.6**: Staging deployment
- [ ] **Task 2.2.7**: Production deployment
- [ ] **Task 2.2.8**: User documentation updates
- [ ] **Task 2.2.9**: Announce feature

### Phase 2 Deliverables

1. ✅ Event settings page with field configuration
2. ✅ Configurable optional fields (address, meal, accommodation, etc.)
3. ✅ Dynamic guest form
4. ✅ Updated RSVP form
5. ✅ User documentation

### Phase 2 Success Criteria

- [ ] Users can toggle optional field sets on/off
- [ ] Forms dynamically adapt to configuration
- [ ] Meal choice labels are customizable
- [ ] Field configuration persists correctly
- [ ] No breaking changes to existing events
- [ ] >40% of events configure at least one optional field
- [ ] <5% support tickets related to field configuration

---

## Phase 3: Custom User-Defined Fields (Future)

**Goal**: Enable power users to create fully custom fields
**Timeline**: 4 weeks (tentative)
**Team**: 1 Backend Dev, 1 Frontend Dev, 1 Designer
**Status**: Future consideration (not committed)

### Scope

#### Features Included
✅ Create up to 10 custom fields per event
✅ Field types: Text, Number, Single-Select, Multi-Select, Date, Checkbox
✅ Field-level configuration (label, help text, required, options)
✅ Custom fields render in guest form and RSVP
✅ Custom fields searchable, filterable, exportable
✅ Custom field data stored in JSON column

#### Features Excluded
❌ Formula fields
❌ Conditional field logic
❌ Field-level permissions
❌ API access to custom field definitions

### High-Level Tasks

1. **Backend**
   - Add `customFieldData` JSON column to `guests` table
   - Add `customFieldDefinitions` JSON column to `events` table
   - Create custom field CRUD API
   - Update guest API to handle custom field data
   - Implement validation engine for custom fields

2. **Frontend**
   - Custom field management UI (create, edit, delete)
   - Dynamic form rendering with custom fields
   - Custom field search and filter UI
   - CSV import/export with custom field mapping

3. **Design**
   - Custom field creation modal
   - Field type selector UI
   - Custom field display in forms and tables

### Phase 3 Success Criteria

- [ ] Users can create up to 10 custom fields
- [ ] All field types render correctly
- [ ] Validation works for all field types
- [ ] Custom fields exportable to CSV
- [ ] >10% of events create at least one custom field
- [ ] <10% support tickets related to custom fields

---

## Implementation Strategy

### Database Architecture Decision

After analyzing trade-offs, the recommended approach is:

**Hybrid Model: Structured Columns + JSON for Custom Fields**

#### Rationale
1. **Event-Type-Specific Fields → Structured Columns**
   - Pros: Strongly typed, indexable, fast queries, easy validation
   - Use Case: Wedding side, badge type, company name, etc.
   - These fields are known in advance and have high query frequency

2. **User-Configurable Optional Fields → Structured Columns**
   - Same rationale as above
   - Address, meal choice, accommodation fields are predictable
   - Better UX with native form controls

3. **Custom User-Defined Fields → JSON Column**
   - Pros: Maximum flexibility, no schema migrations per user
   - Cons: Limited querying, no strict typing
   - Use Case: Truly unique fields (low frequency)
   - Stored in `guests.customFieldData` JSON column

#### Migration Strategy
```sql
-- Phase 1: Event-Type-Specific Fields
ALTER TABLE guests ADD COLUMN weddingGuestSide TEXT CHECK(weddingGuestSide IN ('bride', 'groom', 'both'));
ALTER TABLE guests ADD COLUMN weddingInvitedTo TEXT CHECK(weddingInvitedTo IN ('ceremony', 'reception', 'both'));
ALTER TABLE guests ADD COLUMN weddingGiftDescription TEXT;
-- ... (all event-type fields)

-- Phase 2: Optional Common Fields
ALTER TABLE guests ADD COLUMN addressStreet TEXT;
ALTER TABLE guests ADD COLUMN mealChoice TEXT;
-- ... (all optional fields)

ALTER TABLE events ADD COLUMN eventSettings TEXT; -- JSON

-- Phase 3: Custom Fields
ALTER TABLE guests ADD COLUMN customFieldData TEXT; -- JSON
ALTER TABLE events ADD COLUMN customFieldDefinitions TEXT; -- JSON
```

### API Design Patterns

#### Guest API Request (Phase 1)
```typescript
POST /events/:eventUuid/guests
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "category": "family",
  // Event-type fields (only sent if event is wedding type)
  "weddingGuestSide": "bride",
  "weddingInvitedTo": "both",
  "weddingGiftDescription": "Crystal vase"
}
```

#### Guest API Request (Phase 2)
```typescript
POST /events/:eventUuid/guests
{
  "firstName": "Jane",
  "lastName": "Smith",
  // Optional fields (only sent if enabled in event settings)
  "addressStreet": "123 Main St",
  "addressCity": "Seattle",
  "mealChoice": "vegetarian"
}
```

#### Event Settings API (Phase 2)
```typescript
PATCH /events/:eventUuid/settings
{
  "fieldConfiguration": {
    "enableAddressCollection": true,
    "enableMealSelection": true,
    "mealChoiceOptions": ["Beef", "Chicken", "Vegan", "Child"],
    "enableAccommodation": false,
    "enablePlusOneNames": true
  }
}
```

---

## Resource Requirements

### Phase 1 (3 weeks)
- **Backend Developer**: 3 weeks full-time
- **Frontend Developer**: 3 weeks full-time
- **Designer**: 1 week (Week 1 and Week 2)
- **QA/Testing**: 0.5 weeks (Week 3)
- **Product Manager**: 0.5 weeks (oversight, documentation)

### Phase 2 (2 weeks)
- **Backend Developer**: 2 weeks full-time
- **Frontend Developer**: 2 weeks full-time
- **Designer**: 0.5 weeks (Week 1)
- **QA/Testing**: 0.5 weeks (Week 2)
- **Product Manager**: 0.25 weeks

### Phase 3 (4 weeks - future)
- **Backend Developer**: 4 weeks full-time
- **Frontend Developer**: 4 weeks full-time
- **Designer**: 1 week
- **QA/Testing**: 1 week
- **Product Manager**: 0.5 weeks

---

## Risks & Mitigation

### Risk 1: Database Migration Complexity
**Probability**: Medium | **Impact**: High

**Risk**: Adding 20+ columns could fail on large production databases or cause downtime.

**Mitigation**:
- Test migration on copy of production data
- Run migration during low-traffic window
- Prepare rollback script
- Use database connection pooling to avoid locks
- Consider online schema migration tools if needed

### Risk 2: Performance Degradation
**Probability**: Medium | **Impact**: High

**Risk**: Adding many columns and complex queries could slow down guest list queries.

**Mitigation**:
- Benchmark queries before and after migration
- Add indexes on filterable enum fields
- Implement query result caching (TanStack Query)
- Set up performance monitoring (e.g., Cloudflare Analytics)
- Load test with 5000+ guests

### Risk 3: UX Complexity Overload
**Probability**: High | **Impact**: Medium

**Risk**: Too many fields overwhelm users, especially in Phase 2/3.

**Mitigation**:
- Progressive disclosure (sections, collapsible)
- Clear help text and examples
- Smart defaults (common fields enabled by default)
- User testing before each phase launch
- "Quick Setup" presets (e.g., "Wedding Standard", "Corporate Basic")

### Risk 4: Scope Creep
**Probability**: High | **Impact**: Medium

**Risk**: Stakeholders request additional features mid-development (field reordering, conditional logic, etc.).

**Mitigation**:
- Clearly document "out of scope" items
- Phase-gate approvals (no new features mid-phase)
- Park new ideas in backlog for Phase 4
- Communicate trade-offs (speed vs. features)

### Risk 5: Backward Compatibility Issues
**Probability**: Low | **Impact**: High

**Risk**: Existing guests or events break after migration.

**Mitigation**:
- All new columns nullable (no breaking changes)
- Comprehensive migration tests
- Gradual rollout (staging → 10% → 50% → 100%)
- Rollback plan tested and documented

---

## Success Metrics & Tracking

### Leading Indicators (Monitor Weekly)
- **Field Configuration Rate**: % of new events configuring optional fields
  - Target: 40% by end of Phase 2
- **Event Type Distribution**: % using wedding/corporate/conference vs. other
  - Target: >60% specialized event types
- **Form Abandonment Rate**: % of RSVP forms started but not submitted
  - Target: <15% (hoping for improvement from baseline)

### Lagging Indicators (Monitor Monthly)
- **Feature Adoption**: % of active users using new fields
  - Target: >50% of active users
- **Support Ticket Volume**: Tickets related to guest management
  - Target: <5% increase (acceptable given new complexity)
- **User Satisfaction**: NPS score for event organizer segment
  - Target: +5 points over 3 months
- **Churn Reduction**: Decrease in churn for event organizer segment
  - Target: 10% reduction over 6 months

### Data Collection Plan
- [ ] Set up Mixpanel events for field configuration actions
- [ ] Add Google Analytics events for form interactions
- [ ] Create Grafana dashboard for query performance
- [ ] Set up weekly automated reports
- [ ] Schedule monthly metric review meetings

---

## Post-Launch Plan

### Week 1: Stabilization
- Daily monitoring of error rates
- Quick bug fixes prioritized
- Collect initial user feedback
- Update documentation based on questions

### Week 2-4: Iteration
- Address top 3 user pain points
- Performance optimizations if needed
- Minor UX improvements
- Plan Phase 2 kickoff

### Month 2: Evaluation
- Review success metrics
- Conduct user interviews (10 users)
- Analyze usage patterns
- Decide on Phase 2 timing

### Month 3: Expansion
- Consider additional event types (e.g., Gala, Fundraiser)
- Evaluate Phase 3 viability
- Plan internationalization for field labels
- Explore integration opportunities (e.g., Zapier, CRM export)

---

## Open Questions for Team

1. **Meal Choice Limits**: How many meal options should we allow? (Current thinking: 8)
2. **Custom Field Pricing**: Should custom fields be a paid feature? (Pro/Premium tier)
3. **Field Ordering**: Users will likely request custom field order. Phase 2 or Phase 3?
4. **Template Library**: Should we provide pre-configured templates (e.g., "Classic Wedding", "Tech Conference")?
5. **API Exposure**: When should custom field definitions be exposed via API for integrations?

---

## Appendix

### Alternative Architectures Considered

#### Option A: Pure EAV (Entity-Attribute-Value) Model
- Separate `guest_field_values` table with (guestId, fieldName, fieldValue)
- **Rejected**: Complex queries, poor performance, difficult validation

#### Option B: Pure JSON Column
- All guest data in single JSON column
- **Rejected**: No type safety, no indexing, migration nightmare

#### Option C: Table-per-Event-Type
- Separate `wedding_guests`, `corporate_guests` tables
- **Rejected**: Code duplication, difficult cross-event queries, migration complexity

### Related Documentation
- [Requirements Document](requirements.md)
- [Team Handoffs Document](team-handoffs.md)
- [Database Schema ERD](docs/database-erd.png) (to be created)
- [API Specification](docs/api-spec.md) (to be updated)
