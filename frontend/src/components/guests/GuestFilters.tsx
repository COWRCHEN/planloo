/**
 * Guest Filters
 *
 * Search and filter controls for guest list.
 */

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GUEST_CATEGORIES, RSVP_STATUSES, type GuestCategory, type RsvpStatus } from '@/hooks/use-guests';

interface GuestFiltersProps {
  search: string;
  category: GuestCategory | undefined;
  rsvpStatus: RsvpStatus | undefined;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: GuestCategory | undefined) => void;
  onRsvpStatusChange: (value: RsvpStatus | undefined) => void;
  onClearFilters: () => void;
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
  search,
  category,
  rsvpStatus,
  onSearchChange,
  onCategoryChange,
  onRsvpStatusChange,
  onClearFilters,
}: GuestFiltersProps) {
  const hasFilters = search || category || rsvpStatus;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search guests..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      <Select
        value={category ?? 'all'}
        onValueChange={(value) => onCategoryChange(value === 'all' ? undefined : (value as GuestCategory))}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {GUEST_CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {categoryLabels[cat]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={rsvpStatus ?? 'all'}
        onValueChange={(value) => onRsvpStatusChange(value === 'all' ? undefined : (value as RsvpStatus))}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="RSVP Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {RSVP_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {rsvpStatusLabels[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          Clear
        </Button>
      )}
    </div>
  );
}
