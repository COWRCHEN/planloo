/**
 * Guest Form Page View
 *
 * Full-page add/edit guest form. Used by guests/new and guests/[guestUuid]/edit pages.
 */

import { useState } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GuestForm } from './GuestForm';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import { PlanLimitError } from '@/lib/api-error';
import { useEvent } from '@/hooks/use-events';
import {
  useGuest,
  useGuestSettings,
  useCreateGuest,
  useUpdateGuest,
  type GuestResponse,
  type CreateGuestInput,
} from '@/hooks/use-guests';

interface GuestFormPageViewProps {
  eventUuid: string;
  /** When provided, edit mode; otherwise add mode. */
  guestUuid?: string | null;
}

function GuestFormPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Card>
        <CardContent className="space-y-4 py-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function GuestFormPageContent({ eventUuid, guestUuid }: GuestFormPageViewProps) {
  const guestsListUrl = `/dashboard/events/${eventUuid}/guests`;

  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(eventUuid);
  const { data: guest, isLoading: guestLoading, error: guestError } = useGuest(
    eventUuid,
    guestUuid ?? undefined
  );
  const { data: guestSettings, isLoading: guestSettingsLoading } = useGuestSettings(eventUuid);
  const createGuest = useCreateGuest(eventUuid);
  const updateGuest = useUpdateGuest(eventUuid, guestUuid ?? '');
  const [planLimitError, setPlanLimitError] = useState<PlanLimitError | null>(null);

  const isEditMode = !!guestUuid;
  const isLoading =
    eventLoading || (isEditMode && guestLoading) || guestSettingsLoading;
  const error = eventError ?? (isEditMode ? guestError : null);

  const handleCancel = () => {
    window.location.href = guestsListUrl;
  };

  const handleSuccess = () => {
    window.location.href = guestsListUrl;
  };

  const handleSubmit = async (data: CreateGuestInput) => {
    setPlanLimitError(null);
    try {
      if (isEditMode) {
        // Backend PATCH accepts same shape as create (weddingDetails, optional fields, etc.)
        await updateGuest.mutateAsync(data as Parameters<typeof updateGuest.mutateAsync>[0]);
      } else {
        await createGuest.mutateAsync(data);
      }
    } catch (err) {
      if (err instanceof PlanLimitError) {
        setPlanLimitError(err);
        return;
      }
      throw err;
    }
  };

  if (isLoading) {
    return <GuestFormPageSkeleton />;
  }

  if (eventError || !event) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Failed to load event.</p>
          {eventError && (
            <p className="mt-2 text-sm text-muted-foreground">{eventError.message}</p>
          )}
          <Button asChild variant="outline" className="mt-4">
            <a href="/dashboard/events">Back to Events</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isEditMode && (guestError || (!guestLoading && !guest))) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Guest not found.</p>
          {guestError && (
            <p className="mt-2 text-sm text-muted-foreground">{guestError.message}</p>
          )}
          <Button asChild variant="outline" className="mt-4">
            <a href={guestsListUrl}>Back to Guest List</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <a
          href={guestsListUrl}
          className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-muted"
          aria-label="Back to guest list"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </a>
        <p className="text-muted-foreground">{event.title}</p>
      </div>

      {planLimitError && (
        <UpgradePrompt error={planLimitError} className="mb-4" />
      )}
      <GuestForm
        asPage
        guest={(isEditMode ? guest : null) as GuestResponse | null}
        onSubmit={handleSubmit}
        isSubmitting={createGuest.isPending || updateGuest.isPending}
        eventType={event.eventType ?? null}
        eventUuid={eventUuid}
        guestSettings={guestSettings ?? null}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

export function GuestFormPageView({ eventUuid, guestUuid }: GuestFormPageViewProps) {
  return (
    <QueryProvider>
      <GuestFormPageContent eventUuid={eventUuid} guestUuid={guestUuid ?? undefined} />
    </QueryProvider>
  );
}
