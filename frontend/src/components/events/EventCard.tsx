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

/** SVG path data for each event type icon (heroicons style, 24x24 viewBox) */
const eventTypeIcons: Record<string, React.ReactNode> = {
  wedding: (
    // Heart icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  ),
  birthday: (
    // Cake icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8V4m0 0C11 4 10 3 10 2s1-2 2-2 2 1 2 2-1 2-2 2zm-6 4h12a2 2 0 012 2v2a4 4 0 01-2 3.46V20a2 2 0 01-2 2H8a2 2 0 01-2-2v-4.54A4 4 0 014 12v-2a2 2 0 012-2z"
    />
  ),
  corporate: (
    // Briefcase icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0h2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2"
    />
  ),
  conference: (
    // Microphone / presentation icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
    />
  ),
  other: (
    // Tag icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"
    />
  ),
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
          <h3 className="truncate font-semibold leading-tight">{event.title}</h3>
          <EventStatusBadge status={event.status} />
        </div>
        {event.organizationName && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span className="truncate">{event.organizationName}</span>
          </div>
        )}
        {event.eventType && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {eventTypeIcons[event.eventType] ?? eventTypeIcons.other}
            </svg>
            <span>{eventTypeLabels[event.eventType]}</span>
          </div>
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
