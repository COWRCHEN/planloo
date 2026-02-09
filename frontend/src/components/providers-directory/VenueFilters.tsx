import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VENUE_TYPES, type ListVenuesQuery } from '@/hooks/use-providers';

const venueTypeLabels: Record<string, string> = {
  banquet_hall: 'Banquet Hall',
  outdoor: 'Outdoor',
  hotel: 'Hotel',
  restaurant: 'Restaurant',
  conference_center: 'Conference Center',
  other: 'Other',
};

interface VenueFiltersProps {
  filters: Partial<ListVenuesQuery>;
  onChange: (filters: Partial<ListVenuesQuery>) => void;
}

function buildFilters(base: Partial<ListVenuesQuery>, overrides: Record<string, unknown>): Partial<ListVenuesQuery> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(base)) {
    if (v !== undefined) result[k] = v;
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined) result[k] = v;
    else delete result[k];
  }
  return result as Partial<ListVenuesQuery>;
}

export function VenueFilters({ filters, onChange }: VenueFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== (filters.search ?? '')) {
        onChange(buildFilters(filters, { search: searchInput || undefined, offset: 0 }));
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const hasFilters = filters.search || filters.venueType || filters.capacityMin || filters.priceMax;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search venues..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-64"
      />
      <Select
        value={filters.venueType ?? 'all'}
        onValueChange={(val) =>
          onChange(buildFilters(filters, { venueType: val === 'all' ? undefined : val, offset: 0 }))
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Venue Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {VENUE_TYPES.map((vt) => (
            <SelectItem key={vt} value={vt}>
              {venueTypeLabels[vt] ?? vt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        placeholder="Min capacity"
        value={filters.capacityMin ?? ''}
        onChange={(e) =>
          onChange(buildFilters(filters, { capacityMin: e.target.value ? parseInt(e.target.value, 10) : undefined, offset: 0 }))
        }
        className="w-32"
        min={0}
      />
      <Input
        type="number"
        placeholder="Max price/day"
        value={filters.priceMax ?? ''}
        onChange={(e) =>
          onChange(buildFilters(filters, { priceMax: e.target.value ? parseFloat(e.target.value) : undefined, offset: 0 }))
        }
        className="w-36"
        min={0}
        step="0.01"
      />
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchInput('');
            const cleaned: Partial<ListVenuesQuery> = {};
            if (filters.limit !== undefined) cleaned.limit = filters.limit;
            if (filters.sortBy !== undefined) cleaned.sortBy = filters.sortBy;
            if (filters.sortOrder !== undefined) cleaned.sortOrder = filters.sortOrder;
            onChange(cleaned);
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
