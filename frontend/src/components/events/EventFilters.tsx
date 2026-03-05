/**
 * Event Filters
 *
 * Filter and sort controls for the events list.
 */

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EventStatus, EventType, EventSource } from '@/hooks/use-events';

const EVENT_STATUSES: { value: EventStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'planning', label: 'Planning' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const EVENT_TYPES: { value: EventType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'baby_shower', label: 'Baby Shower' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'bridal_shower', label: 'Bridal Shower' },
  { value: 'celebration_of_life', label: 'Celebration of Life' },
  { value: 'conference', label: 'Conference' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'engagement_party', label: 'Engagement Party' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'graduation', label: 'Graduation Party' },
  { value: 'holiday_party', label: 'Holiday Party' },
  { value: 'retirement', label: 'Retirement Party' },
  { value: 'themed', label: 'Themed Event' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'other', label: 'Other' },
];

const EVENT_SOURCES: { value: EventSource; label: string }[] = [
  { value: 'all', label: 'All Events' },
  { value: 'personal', label: 'Personal' },
  { value: 'organization', label: 'Organization' },
  { value: 'collaboration', label: 'Shared with Me' },
];

const SORT_OPTIONS = [
  { value: 'startDate-asc', label: 'Date (Earliest)' },
  { value: 'startDate-desc', label: 'Date (Latest)' },
  { value: 'createdAt-desc', label: 'Newest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
];

interface EventFiltersProps {
  status?: EventStatus | undefined;
  eventType?: EventType | undefined;
  source?: EventSource | undefined;
  sortBy?: string | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
  onStatusChange: (status: EventStatus | undefined) => void;
  onEventTypeChange: (eventType: EventType | undefined) => void;
  onSourceChange: (source: EventSource | undefined) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onClearFilters: () => void;
}

export function EventFilters({
  status,
  eventType,
  source,
  sortBy = 'startDate',
  sortOrder = 'asc',
  onStatusChange,
  onEventTypeChange,
  onSourceChange,
  onSortChange,
  onClearFilters,
}: EventFiltersProps) {
  const hasFilters = status !== undefined || eventType !== undefined || (source !== undefined && source !== 'all');
  const currentSort = `${sortBy}-${sortOrder}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={status ?? 'all'}
        onValueChange={(value) => onStatusChange(value === 'all' ? undefined : (value as EventStatus))}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {EVENT_STATUSES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={eventType ?? 'all'}
        onValueChange={(value) =>
          onEventTypeChange(value === 'all' ? undefined : (value as EventType))
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {EVENT_TYPES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={source ?? 'all'}
        onValueChange={(value) =>
          onSourceChange(value === 'all' ? undefined : (value as EventSource))
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          {EVENT_SOURCES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentSort}
        onValueChange={(value) => {
          const [newSortBy, newSortOrder] = value.split('-') as [string, 'asc' | 'desc'];
          onSortChange(newSortBy, newSortOrder);
        }}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
