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
import {
  PROVIDER_CATEGORIES,
  PRICE_RANGES,
  type ListProvidersQuery,
} from '@/hooks/use-providers';
import { SUPPORTED_COUNTRIES } from '../../../../shared/schemas/provider';

const categoryLabels: Record<string, string> = {
  catering: 'Catering',
  photography: 'Photography',
  videography: 'Videography',
  dj: 'DJ',
  entertainment: 'Entertainment',
  florist: 'Florist',
  decoration: 'Decoration',
  transportation: 'Transportation',
  av_technology: 'AV & Technology',
  hair_makeup: 'Hair & Makeup',
  other: 'Other',
};

interface ProviderFiltersProps {
  filters: Partial<ListProvidersQuery>;
  onChange: (filters: Partial<ListProvidersQuery>) => void;
}

function buildFilters(base: Partial<ListProvidersQuery>, overrides: Record<string, unknown>): Partial<ListProvidersQuery> {
  const result: Record<string, unknown> = {};
  // Copy only defined values from base
  for (const [k, v] of Object.entries(base)) {
    if (v !== undefined) result[k] = v;
  }
  // Apply overrides, removing undefined
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined) result[k] = v;
    else delete result[k];
  }
  return result as Partial<ListProvidersQuery>;
}

export function ProviderFilters({ filters, onChange }: ProviderFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== (filters.search ?? '')) {
        onChange(buildFilters(filters, { search: searchInput || undefined, offset: 0 }));
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const hasFilters = filters.search || filters.category || filters.priceRange || filters.country;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search providers..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-64"
      />
      <Select
        value={filters.category ?? 'all'}
        onValueChange={(val) =>
          onChange(buildFilters(filters, { category: val === 'all' ? undefined : val, offset: 0 }))
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {PROVIDER_CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {categoryLabels[cat] ?? cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.priceRange ?? 'all'}
        onValueChange={(val) =>
          onChange(buildFilters(filters, { priceRange: val === 'all' ? undefined : val, offset: 0 }))
        }
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Price" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Price</SelectItem>
          {PRICE_RANGES.map((pr) => (
            <SelectItem key={pr} value={pr}>{pr}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.country ?? 'all'}
        onValueChange={(val) =>
          onChange(buildFilters(filters, { country: val === 'all' ? undefined : val, offset: 0 }))
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Country" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Countries</SelectItem>
          {SUPPORTED_COUNTRIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c === 'US' ? 'United States' : 'Canada'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchInput('');
            const cleaned: Partial<ListProvidersQuery> = {};
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
