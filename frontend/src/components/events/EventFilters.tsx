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
import type { EventStatus, EventType } from '@/hooks/use-events';

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
  { value: 'wedding', label: 'Wedding' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'conference', label: 'Conference' },
  { value: 'other', label: 'Other' },
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
  sortBy?: string | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
  onStatusChange: (status: EventStatus | undefined) => void;
  onEventTypeChange: (eventType: EventType | undefined) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onClearFilters: () => void;
}

export function EventFilters({
  status,
  eventType,
  sortBy = 'startDate',
  sortOrder = 'asc',
  onStatusChange,
  onEventTypeChange,
  onSortChange,
  onClearFilters,
}: EventFiltersProps) {
  const hasFilters = status !== undefined || eventType !== undefined;
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
