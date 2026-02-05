/**
 * Empty Event State
 *
 * Displayed when the user has no events.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyEventStateProps {
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function EmptyEventState({ hasFilters, onClearFilters }: EmptyEventStateProps) {
  if (hasFilters) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">No events found</h3>
          <p className="mb-6 max-w-sm text-muted-foreground">
            No events match your current filters. Try adjusting your search criteria.
          </p>
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-primary/10 p-4">
          <svg
            className="h-8 w-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold">No events yet</h3>
        <p className="mb-6 max-w-sm text-muted-foreground">
          Get started by creating your first event. Plan weddings, birthdays, corporate events, and
          more.
        </p>
        <Button asChild>
          <a href="/dashboard/events/new">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Event
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
