# Guest Fields System - Executive Summary

**Project:** Planloo Event Planning SaaS
**Feature:** Flexible Guest Fields System
**Document Date:** 2026-02-05
**Status:** Design Complete - Ready for Implementation

---

## Overview

This design provides a comprehensive solution for implementing a flexible guest fields system that adapts to different event types (wedding, birthday, corporate, conference) while maintaining user configurability. The system replaces the current one-size-fits-all approach with event-specific fields that deliver targeted value for each event type.

---

## What's Been Delivered

### 1. Complete Requirements Document
**File:** `requirements.md`

Contains:
- 15 detailed user stories with acceptance criteria
- Functional requirements for all 5 event types
- Complete field definitions (40+ new fields)
- Non-functional requirements (performance, usability, scalability)
- Success metrics and KPIs
- Open questions for team discussion

**Key Highlights:**
- **Wedding Events**: 6 specialized fields (guest side, invited to, gift tracking, thank you cards)
- **Corporate Events**: 4 specialized fields (company, job title, department, attendee type)
- **Conference Events**: 5 specialized fields (badge type, organization, sessions, special access, attending days)
- **Birthday Events**: 3 specialized fields (relationship, age group, gift contribution)
- **User-Configurable Fields**: 12+ optional field sets (address, meal choice, accommodation, etc.)

---

### 2. Detailed Project Roadmap
**File:** `project-roadmap.md`

Contains:
- 3-phase implementation plan (Phase 1: 3 weeks, Phase 2: 2 weeks, Phase 3: 4 weeks future)
- Week-by-week task breakdown with effort estimates
- Database architecture decision (Hybrid Model: Structured Columns + JSON)
- Complete migration strategy with SQL examples
- API design patterns with code examples
- Risk mitigation strategies for 5 major risks
- Success metrics and tracking plan
- Post-launch monitoring plan

**Phase 1 Timeline (MVP - 3 Weeks):**
- Week 1: Foundation - Database migration, API updates, design mockups
- Week 2: UI Implementation - Dynamic forms, table updates, badges
- Week 3: Polish, Testing & Launch - CSV, RSVP, testing, documentation

**Resource Requirements:**
- 1 Backend Developer (3 weeks full-time)
- 1 Frontend Developer (3 weeks full-time)
- 1 Designer (1 week in Week 1-2)
- 0.5 QA/Testing (Week 3)
- 0.5 Product Manager (oversight)

---

### 3. Team Handoffs Document
**File:** `team-handoffs.md`

Contains role-specific specifications:

**Designer Handoff:**
- 4 design deliverables with detailed requirements
- Component specifications (guest form, table, detail view, RSVP form)
- Design system integration guide (shadcn/ui components)
- Responsive design requirements
- Accessibility requirements (WCAG 2.1 AA)
- Example user flows

**Backend Developer Handoff:**
- Complete database schema updates (40+ new columns)
- Drizzle ORM migration scripts
- API endpoint update specifications for all CRUD operations
- CSV import/export logic updates
- Performance benchmarks (< 200ms for 1000 guests)
- Testing requirements (unit, integration, load tests)
- Error handling patterns

**Frontend Developer Handoff:**
- TypeScript type definitions for all new fields
- React component architecture (event-type field sections)
- Dynamic form rendering logic with code examples
- TanStack Query integration updates
- Badge component specifications with color schemes
- Filter UI implementation
- Accessibility checklist
- Testing requirements (component tests with examples)

---

## Key Design Decisions

### Database Architecture: Hybrid Model

**Decision:** Use structured columns for known fields, JSON for future custom fields

**Rationale:**
1. **Event-Type-Specific Fields → Structured Columns**
   - Pros: Strongly typed, indexable, fast queries, easy validation
   - Use for: Wedding side, badge type, company name (predictable, high-query fields)

2. **User-Configurable Optional Fields → Structured Columns**
   - Same benefits as above
   - Use for: Address, meal choice, accommodation (known in advance)

3. **Custom User-Defined Fields → JSON Column (Phase 3)**
   - Pros: Maximum flexibility, no schema migrations per user
   - Use for: Truly unique custom fields (low query frequency)

**Rejected Alternatives:**
- Pure EAV model (too complex, poor performance)
- Pure JSON column (no type safety, no indexing)
- Table-per-event-type (code duplication, difficult migrations)

---

### Field Counts by Event Type

| Event Type | Specialized Fields | Optional Common Fields | Total Possible Fields |
|------------|-------------------|----------------------|---------------------|
| Wedding | 6 | 12+ | 30+ |
| Corporate | 4 | 12+ | 28+ |
| Conference | 5 | 12+ | 29+ |
| Birthday | 3 | 12+ | 27+ |
| Other | 0 | 12+ | 24+ |

**Core Fields (All Events):** 12 fields (firstName, lastName, email, phone, category, rsvpStatus, plusOnes, dietaryRestrictions, notes, checkedIn, etc.)

---

## Implementation Phases

### Phase 1: Event-Type-Specific Fields (3 Weeks) - RECOMMENDED START

**Goal:** Ship differentiated guest fields for all 5 event types

**User Value:**
- Wedding organizers can track bride/groom side and gift thank-yous
- Corporate event planners can collect company info for badges
- Conference organizers can assign badge types and track sessions
- Birthday party hosts can track relationships and gift contributions

**Technical Scope:**
- Add 40+ columns to guests table
- Update all CRUD API endpoints
- Create dynamic form with event-type sections
- Add event-specific filters and badges
- Update CSV import/export

**Success Criteria:**
- Query performance < 200ms for 1000 guests
- Zero data loss for existing guests
- >60% of new events use specialized event types (not "other")

---

### Phase 2: User-Configurable Fields (2 Weeks) - NEXT PRIORITY

**Goal:** Give users control over optional field visibility

**User Value:**
- Toggle address collection on/off per event
- Customize meal choice labels to match caterer menu
- Enable/disable accommodation tracking
- Reduce form clutter by hiding unused fields

**Technical Scope:**
- Add eventSettings JSON column to events table
- Add optional field columns (address, meal, accommodation, etc.)
- Build event settings UI with toggle controls
- Update forms to dynamically render based on configuration

**Success Criteria:**
- >40% of events configure at least one optional field
- Forms dynamically adapt to configuration without bugs
- <5% support tickets related to field configuration

---

### Phase 3: Custom User-Defined Fields (4 Weeks) - FUTURE

**Goal:** Enable power users to create fully custom fields

**User Value:**
- Create up to 10 custom fields per event
- Support for text, number, select, checkbox, date field types
- Perfect for unique use cases not covered by standard fields

**Technical Scope:**
- Add customFieldData JSON column to guests table
- Add customFieldDefinitions JSON column to events table
- Build custom field management UI
- Implement dynamic validation engine

**Success Criteria:**
- >10% of events create at least one custom field
- All field types render and validate correctly
- <10% support tickets related to custom fields

**Note:** Phase 3 is a future consideration, not committed in current roadmap.

---

## Risk Assessment & Mitigation

### Top 5 Risks

1. **Database Migration Complexity** (Medium Probability, High Impact)
   - Mitigation: Test on production copy, low-traffic deployment window, rollback script ready

2. **Performance Degradation** (Medium Probability, High Impact)
   - Mitigation: Benchmarking, indexing strategy, load testing with 5000+ guests

3. **UX Complexity Overload** (High Probability, Medium Impact)
   - Mitigation: Progressive disclosure, user testing, smart defaults, clear help text

4. **Scope Creep** (High Probability, Medium Impact)
   - Mitigation: Document "out of scope" items, phase-gate approvals, parking lot for Phase 4

5. **Backward Compatibility Issues** (Low Probability, High Impact)
   - Mitigation: All columns nullable, comprehensive tests, gradual rollout

---

## Success Metrics

### Adoption Metrics
- **Field Configuration Rate**: 40% of events configure at least one optional field
- **Event-Type Usage**: >60% of new events use specialized types (not "other")

### Engagement Metrics
- **Form Completion Rate**: 10% increase from baseline
- **Data Completeness**: >50% completion for enabled optional fields

### Satisfaction Metrics
- **NPS Impact**: +5 point increase
- **Feature Request Reduction**: 50% reduction in custom field requests

---

## Next Steps

### Immediate Actions (This Week)

1. **Review & Approval Meeting** (Product, Engineering, Design)
   - Review all three documents
   - Answer open questions
   - Get formal sign-off on Phase 1 scope

2. **Kickoff Meeting** (Full Team)
   - Present roadmap and timeline
   - Assign roles and responsibilities
   - Set up communication channels (Slack, daily standups)

3. **Designer Starts Work** (Day 1)
   - Begin low-fi wireframes for guest form
   - Sketch event-type field sections
   - Present for feedback by Day 2

4. **Backend Dev Prepares** (Day 1-2)
   - Create feature branch: `feature/guest-fields-system`
   - Review current schema and migration tools
   - Draft initial migration script

5. **Frontend Dev Prepares** (Day 1-2)
   - Review shadcn/ui component library
   - Audit current GuestForm component
   - Set up component structure for event-type fields

### Week 1 Milestones
- [ ] Design mockups approved (Day 4)
- [ ] Database migration tested in staging (Day 3)
- [ ] API endpoints updated and tested (Day 5)
- [ ] Event-type field mapping config created (Day 5)

### Phase 1 Launch Target
**Target Date:** 3 weeks from kickoff (Week of [Date])

---

## Open Questions for Team Discussion

1. **Meal Choice Limits**: How many meal options should we allow in Phase 2? (Current thinking: 8)

2. **Custom Field Pricing**: Should custom fields (Phase 3) be a paid feature for Pro/Premium tiers?

3. **Field Ordering**: Will users request custom field order? Should we support it in Phase 2 or Phase 3?

4. **Template Library**: Should we provide pre-configured templates (e.g., "Classic Wedding", "Tech Conference")?

5. **API Exposure**: When should custom field definitions be exposed via API for integrations?

6. **Conference Sessions**: How do we handle session registration if event organizers haven't created sessions yet? Pre-populate with text field?

---

## Documentation Files

All documentation is located in the project root:

```
planloo/
├── requirements.md                      # Complete requirements specification
├── project-roadmap.md                   # 3-phase roadmap with detailed tasks
├── team-handoffs.md                     # Role-specific implementation specs
└── GUEST-FIELDS-SYSTEM-SUMMARY.md      # This file
```

**Related Files to Create:**
- `docs/database-erd.png` - Entity relationship diagram (after schema finalized)
- `docs/api-spec.md` - Updated API documentation (after endpoints implemented)
- `performance-test-results.md` - Load testing results (after testing complete)

---

## Competitive Advantage

### Why This Matters

**Current State:**
- Generic guest management identical across all event types
- Organizers use notes field or external tools for specialized tracking
- No differentiation from competitors

**Future State:**
- Best-in-class guest management for weddings (better than The Knot, Zola)
- Best-in-class for corporate events (better than Eventbrite)
- Best-in-class for conferences (better than Whova, Bizzabo)
- All in one platform with unified experience

**User Impact:**
- Wedding organizers: "Finally, I can track thank you cards in one place!"
- Corporate planners: "Badge printing is so much easier with job titles built-in"
- Conference organizers: "Speaker vs. attendee badges are now automatic"

---

## Technical Debt & Future Considerations

### Not Included in Phase 1-3

**Field Features:**
- Formula fields (calculated values)
- Field-level permissions (show to organizers only)
- Conditional field logic (show field B if field A = X)
- Field dependency rules
- Multi-language field labels
- Field change audit logs
- Field validation rules (regex, min/max)

**Integration Features:**
- API access to custom field definitions
- Zapier integration for custom fields
- CRM export with custom field mapping
- Webhook notifications on field changes

**UI Features:**
- Drag-and-drop field reordering
- Field templates (save and reuse configurations)
- Bulk field editing (update multiple guests at once)
- Advanced search (combine multiple field filters with AND/OR logic)

**Data Features:**
- Field usage analytics (which fields are most popular?)
- Field-level encryption for sensitive data
- Field history/versioning
- Soft delete for custom field definitions

---

## Conclusion

This design provides a complete, actionable plan to implement a flexible guest fields system that:

1. **Delivers Immediate Value**: Phase 1 ships event-specific fields in 3 weeks
2. **Scales with Users**: Phase 2 enables user configuration without backend changes
3. **Future-Proofs**: Phase 3 supports unlimited customization via custom fields
4. **Minimizes Risk**: Hybrid database approach balances performance with flexibility
5. **Maintains Quality**: Comprehensive testing, performance benchmarks, accessibility standards

**Estimated Total Effort:**
- Phase 1: 3 weeks (recommended immediate start)
- Phase 2: 2 weeks (follow-on, 2-3 months after Phase 1)
- Phase 3: 4 weeks (future consideration, 6-12 months out)

**Recommended Action:** Approve Phase 1 scope and schedule kickoff meeting for next week.

---

**Questions or Feedback?**

Contact Product Manager: [Your Name] ([your.email@planloo.com])

---

**Document Version:** 1.0
**Last Updated:** 2026-02-05
**Status:** Ready for Review
