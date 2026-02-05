/**
 * Event Card
 *
 * Card component for displaying event summary in list/grid view.
 */

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventStatusBadge } from './EventStatusBadge';
import type { EventResponse } from '@/hooks/use-events';

interface EventCardProps {
  event: EventResponse;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

const eventTypeLabels: Record<string, string> = {
  wedding: 'Wedding',
  birthday: 'Birthday',
  corporate: 'Corporate',
  conference: 'Conference',
  other: 'Other',
};

export function EventCard({ event }: EventCardProps) {
  const locationParts = [event.locationCity, event.locationCountry].filter(Boolean);
  const locationText = locationParts.length > 0 ? locationParts.join(', ') : null;

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      {event.coverImageUrl && (
        <div className="aspect-video overflow-hidden rounded-t-lg">
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold leading-tight">{event.title}</h3>
          <EventStatusBadge status={event.status} />
        </div>
        {event.eventType && (
          <p className="text-sm text-muted-foreground">{eventTypeLabels[event.eventType]}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{formatDate(event.startDate)}</span>
            <span className="text-muted-foreground/60">{formatTime(event.startDate)}</span>
          </div>
          {locationText && (
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="truncate">{locationText}</span>
            </div>
          )}
          {event.guestCountExpected !== null && event.guestCountExpected > 0 && (
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <span>
                {event.guestCountConfirmed ?? 0} / {event.guestCountExpected} guests
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="gap-2 pt-0">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <a href={`/dashboard/events/${event.uuid}`}>View</a>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href={`/dashboard/events/${event.uuid}/edit`}>Edit</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
