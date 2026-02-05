/**
 * Empty Guest State
 *
 * Displayed when there are no guests in the list.
 */

import { Button } from '@/components/ui/button';

interface EmptyGuestStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onAddGuest: () => void;
}

export function EmptyGuestState({
  hasFilters,
  onClearFilters,
  onAddGuest,
}: EmptyGuestStateProps) {
  if (hasFilters) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <div className="mx-auto mb-4 h-12 w-12 text-muted-foreground">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="mb-2 font-medium">No guests found</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          No guests match your current filters.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <div className="mx-auto mb-4 h-12 w-12 text-muted-foreground">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <h3 className="mb-2 font-medium">No guests yet</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Start building your guest list by adding your first guest.
      </p>
      <Button onClick={onAddGuest}>
        <svg
          className="mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Guest
      </Button>
    </div>
  );
}
