/**
 * Guest Filters Component
 *
 * Advanced filters for guests including core, event-type-specific, and optional field filters.
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  GUEST_CATEGORIES,
  RSVP_STATUSES,
  WEDDING_GUEST_SIDES,
  WEDDING_INVITED_TO,
  ATTENDEE_TYPES,
  BADGE_TYPES,
  AGE_GROUPS,
  type EventType,
  type EventGuestSettings,
  type ListGuestsQuery,
  type GuestCategory,
  type RsvpStatus,
} from '@/hooks/use-guests';

interface GuestFiltersProps {
  filters: ListGuestsQuery;
  onChange: (filters: Partial<ListGuestsQuery>) => void;
  onReset: () => void;
  eventType?: EventType | null;
  guestSettings?: EventGuestSettings | null;
}

const categoryLabels: Record<GuestCategory, string> = {
  vip: 'VIP',
  family: 'Family',
  friend: 'Friend',
  colleague: 'Colleague',
  other: 'Other',
};

const rsvpStatusLabels: Record<RsvpStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  declined: 'Declined',
  maybe: 'Maybe',
};

export function GuestFilters({
  filters,
  onChange,
  onReset,
  eventType,
  guestSettings,
}: GuestFiltersProps) {
  const hasActiveFilters =
    filters.search ||
    filters.category ||
    filters.rsvpStatus ||
    filters.checkedIn !== undefined ||
    filters.guestSide ||
    filters.invitedTo ||
    filters.thankYouSent !== undefined ||
    filters.attendeeType ||
    filters.badgeType ||
    filters.sessionsRegistered ||
    filters.needsAccommodation !== undefined ||
    filters.needsTransportation !== undefined ||
    filters.ageGroup ||
    filters.tableAssignment ||
    filters.mealChoice;

  // Check if event-type-specific or optional filters are available
  const hasAdvancedFilters = eventType === 'wedding' || 
    eventType === 'corporate' || 
    eventType === 'conference' || 
    eventType === 'birthday' ||
    guestSettings?.enableTableAssignment ||
    guestSettings?.enableMealChoice ||
    guestSettings?.enableAccommodation ||
    guestSettings?.enableTransportation;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search guests..."
          value={filters.search ?? ''}
          onChange={(e) => onChange({ search: e.target.value || undefined })}
          className="w-full"
        />
      </div>

      {/* Category */}
      <Select
        value={filters.category ?? '_all'}
        onValueChange={(value) =>
          onChange({ category: value === '_all' ? undefined : value as GuestCategory })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Categories</SelectItem>
          {GUEST_CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {categoryLabels[cat]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* RSVP Status */}
      <Select
        value={filters.rsvpStatus ?? '_all'}
        onValueChange={(value) =>
          onChange({ rsvpStatus: value === '_all' ? undefined : value as RsvpStatus })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="RSVP" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Statuses</SelectItem>
          {RSVP_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {rsvpStatusLabels[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Advanced Filters Popover - only show if event type or optional fields available */}
      {hasAdvancedFilters && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              More
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Advanced Filters</h4>

              {/* Check-in filter */}
              <div>
                <Label className="text-xs text-muted-foreground">Check-in</Label>
                <Select
                  value={filters.checkedIn === undefined ? '_all' : filters.checkedIn.toString()}
                  onValueChange={(value) =>
                    onChange({ checkedIn: value === '_all' ? undefined : value === 'true' })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All</SelectItem>
                    <SelectItem value="true">Checked In</SelectItem>
                    <SelectItem value="false">Not Checked In</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Wedding-specific filters */}
              {eventType === 'wedding' && (
                <div className="space-y-3 pt-2 border-t">
                  <h5 className="text-xs font-medium text-muted-foreground">Wedding</h5>

                  <div>
                    <Label className="text-xs text-muted-foreground">Guest Side</Label>
                    <Select
                      value={filters.guestSide ?? '_all'}
                      onValueChange={(value) =>
                        onChange({ guestSide: value === '_all' ? undefined : value as ListGuestsQuery['guestSide'] })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All sides" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All sides</SelectItem>
                        {WEDDING_GUEST_SIDES.map((side) => (
                          <SelectItem key={side} value={side}>
                            {side.charAt(0).toUpperCase() + side.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Invited To</Label>
                    <Select
                      value={filters.invitedTo ?? '_all'}
                      onValueChange={(value) =>
                        onChange({ invitedTo: value === '_all' ? undefined : value as ListGuestsQuery['invitedTo'] })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All events" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All events</SelectItem>
                        {WEDDING_INVITED_TO.map((inv) => (
                          <SelectItem key={inv} value={inv}>
                            {inv.charAt(0).toUpperCase() + inv.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Corporate-specific filters */}
              {eventType === 'corporate' && (
                <div className="space-y-3 pt-2 border-t">
                  <h5 className="text-xs font-medium text-muted-foreground">Corporate</h5>

                  <div>
                    <Label className="text-xs text-muted-foreground">Attendee Type</Label>
                    <Select
                      value={filters.attendeeType ?? '_all'}
                      onValueChange={(value) =>
                        onChange({ attendeeType: value === '_all' ? undefined : value as ListGuestsQuery['attendeeType'] })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All types</SelectItem>
                        {ATTENDEE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Conference-specific filters */}
              {eventType === 'conference' && (
                <div className="space-y-3 pt-2 border-t">
                  <h5 className="text-xs font-medium text-muted-foreground">Conference</h5>

                  <div>
                    <Label className="text-xs text-muted-foreground">Badge Type</Label>
                    <Select
                      value={filters.badgeType ?? '_all'}
                      onValueChange={(value) =>
                        onChange({ badgeType: value === '_all' ? undefined : value as ListGuestsQuery['badgeType'] })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All badges" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All badges</SelectItem>
                        {BADGE_TYPES.map((badge) => (
                          <SelectItem key={badge} value={badge}>
                            {badge.charAt(0).toUpperCase() + badge.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Birthday-specific filters */}
              {eventType === 'birthday' && (
                <div className="space-y-3 pt-2 border-t">
                  <h5 className="text-xs font-medium text-muted-foreground">Birthday</h5>

                  <div>
                    <Label className="text-xs text-muted-foreground">Age Group</Label>
                    <Select
                      value={filters.ageGroup ?? '_all'}
                      onValueChange={(value) =>
                        onChange({ ageGroup: value === '_all' ? undefined : value as ListGuestsQuery['ageGroup'] })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All ages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">All ages</SelectItem>
                        {AGE_GROUPS.map((age) => (
                          <SelectItem key={age} value={age}>
                            {age.charAt(0).toUpperCase() + age.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Optional field filters */}
              {(guestSettings?.enableTableAssignment ||
                guestSettings?.enableMealChoice ||
                guestSettings?.enableAccommodation ||
                guestSettings?.enableTransportation) && (
                <div className="space-y-3 pt-2 border-t">
                  <h5 className="text-xs font-medium text-muted-foreground">Additional</h5>

                  {guestSettings.enableTableAssignment && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Table</Label>
                      <Input
                        placeholder="Filter by table..."
                        value={filters.tableAssignment ?? ''}
                        onChange={(e) =>
                          onChange({ tableAssignment: e.target.value || undefined })
                        }
                        className="mt-1"
                      />
                    </div>
                  )}

                  {guestSettings.enableMealChoice && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Meal Choice</Label>
                      <Select
                        value={filters.mealChoice ?? '_all'}
                        onValueChange={(value) =>
                          onChange({ mealChoice: value === '_all' ? undefined : value })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="All meals" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">All meals</SelectItem>
                          {(guestSettings.mealChoiceOptions ?? []).map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {guestSettings.enableAccommodation && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Needs Accommodation</Label>
                      <Select
                        value={filters.needsAccommodation === undefined ? '_all' : filters.needsAccommodation.toString()}
                        onValueChange={(value) =>
                          onChange({ needsAccommodation: value === '_all' ? undefined : value === 'true' })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">All</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {guestSettings.enableTransportation && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Needs Transportation</Label>
                      <Select
                        value={filters.needsTransportation === undefined ? '_all' : filters.needsTransportation.toString()}
                        onValueChange={(value) =>
                          onChange({ needsTransportation: value === '_all' ? undefined : value === 'true' })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">All</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          Clear
        </Button>
      )}
    </div>
  );
}

export default GuestFilters;
