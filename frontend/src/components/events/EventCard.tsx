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
  holiday_party: 'Holiday Party',
  engagement_party: 'Engagement Party',
  fundraiser: 'Fundraiser',
  anniversary: 'Anniversary',
  graduation: 'Graduation Party',
  retirement: 'Retirement Party',
  baby_shower: 'Baby Shower',
  bridal_shower: 'Bridal Shower',
  themed: 'Themed Event',
  celebration_of_life: 'Celebration of Life',
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
  holiday_party: (
    // Bell icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  ),
  engagement_party: (
    // Star icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    />
  ),
  fundraiser: (
    // Users icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  ),
  anniversary: (
    // Clock icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
  graduation: (
    // Academic cap icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m-6-3.5l6 3.5 6-3.5"
    />
  ),
  retirement: (
    // Sun icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v1m0 16v1M4.22 4.22l.707.707M18.364 18.364l.707.707M1 12h2m18 0h2M4.22 19.78l.707-.707M18.364 5.636l.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  ),
  baby_shower: (
    // Gift icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20 12v10H4V12M22 7H2v5h20V7zM12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"
    />
  ),
  bridal_shower: (
    // Sparkle icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    />
  ),
  themed: (
    // Template / layout icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
    />
  ),
  celebration_of_life: (
    // Fire / flame icon
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
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
