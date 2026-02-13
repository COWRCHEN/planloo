/**
 * Event Settings View
 *
 * Settings page for configuring event-specific options including
 * guest field settings and custom fields.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GuestFieldSettings } from '@/components/guests/GuestFieldSettings';
import { CommonFieldSettings } from '@/components/guests/CommonFieldSettings';
import { CustomFieldManager } from '@/components/guests/CustomFieldManager';
import { RsvpSettings } from '@/components/events/RsvpSettings';
import { RsvpFormFieldSettings } from '@/components/events/RsvpFormFieldSettings';
import { PrivacySharingSettings } from '@/components/events/PrivacySharingSettings';
import { CollaboratorsList } from '@/components/events/CollaboratorsList';
import { useEvent, useRsvpSettings } from '@/hooks/use-events';
import { useSession } from '@/hooks/use-auth';
import { useOrganizations } from '@/hooks/use-organizations';

interface EventSettingsViewProps {
  uuid: string;
}

const eventTypeLabels: Record<string, string> = {
  wedding: 'Wedding',
  birthday: 'Birthday',
  corporate: 'Corporate Event',
  conference: 'Conference',
  other: 'Other',
};

function EventSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-10 w-64" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function EventSettingsContent({ uuid }: EventSettingsViewProps) {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: event, isLoading, error } = useEvent(uuid);
  const { data: rsvpSettings } = useRsvpSettings(uuid);
  const { data: orgs } = useOrganizations();

  // Find the org name if the event is assigned to one
  const assignedOrg = event?.organizationId && orgs
    ? orgs.find((o) => o.id === event.organizationId)
    : null;

  // Derive permissions from _access (default to full access for backward compatibility)
  const access = event?._access;
  const canEdit = access?.canEdit ?? true;
  const canManageGuests = access?.canManageGuests ?? true;
  const canManageCollaborators = access?.canManageCollaborators ?? true;
  const isViewer = access ? !access.canEdit : false;

  if (sessionLoading || isLoading) {
    return <EventSettingsSkeleton />;
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to view event settings.</p>
          <Button asChild className="mt-4">
            <a href="/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Failed to load event.</p>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Button asChild variant="outline" className="mt-4">
            <a href="/dashboard/events">Back to Events</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!event) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Event not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <a href="/dashboard/events">Back to Events</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <a
            href={`/dashboard/events/${uuid}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-muted"
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
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Event Settings</h1>
            <p className="text-muted-foreground">
              {event.title}
              {event.eventType && ` - ${eventTypeLabels[event.eventType]}`}
              {assignedOrg && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {assignedOrg.name}
                </Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`/dashboard/events/${uuid}`}>View Event</a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/dashboard/events/${uuid}/guests`}>Guest List</a>
          </Button>
        </div>
      </div>

      {/* Read-only notice for viewers */}
      {isViewer && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                  View-only access
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  You can view these settings but don't have permission to make changes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Accordion */}
      <Accordion type="single" collapsible className="w-full space-y-4">
        {canManageGuests && (
          <AccordionItem value="field-settings">
            <AccordionTrigger>Guest Field Settings</AccordionTrigger>
            <AccordionContent>
              <Tabs defaultValue="common-fields" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="common-fields">Common Fields</TabsTrigger>
                  <TabsTrigger value="guest-fields">Guest Fields</TabsTrigger>
                  <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
                </TabsList>

                <TabsContent value="guest-fields" className="space-y-6">
                  {/* Event Type Info */}
                  {event.eventType && event.eventType !== 'other' && (
                    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <svg
                            className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div>
                            <p className="font-medium text-blue-900 dark:text-blue-100">
                              {eventTypeLabels[event.eventType]} Event
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              This event includes specialized fields for {eventTypeLabels[event.eventType]?.toLowerCase() ?? 'this'} events.
                              These fields are automatically available in guest forms based on your event type.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <GuestFieldSettings eventUuid={uuid} />
                </TabsContent>

                <TabsContent value="common-fields" className="space-y-6">
                  <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <svg
                          className="h-5 w-5 text-slate-600 dark:text-slate-400 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            Common Fields
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            Mark which base fields (first name, last name, email, phone) are required when guests are added or updated.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <CommonFieldSettings eventUuid={uuid} />
                </TabsContent>

                <TabsContent value="custom-fields" className="space-y-6">
                  {/* Custom Fields Info */}
                  <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <svg
                          className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                        <div>
                          <p className="font-medium text-amber-900 dark:text-amber-100">
                            Custom Fields
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            Create your own fields to collect any additional information from guests.
                            Supports text, numbers, dates, checkboxes, and dropdown selections.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <CustomFieldManager eventUuid={uuid} />
                </TabsContent>
              </Tabs>
            </AccordionContent>
          </AccordionItem>
        )}

        {canEdit && (
          <AccordionItem value="rsvp-settings">
            <AccordionTrigger>RSVP & Invitations</AccordionTrigger>
            <AccordionContent>
              <RsvpSettings eventUuid={uuid} />
            </AccordionContent>
          </AccordionItem>
        )}

        {canEdit && rsvpSettings?.enableRsvp && (
          <AccordionItem value="rsvp-form-fields">
            <AccordionTrigger>RSVP Form Fields</AccordionTrigger>
            <AccordionContent>
              <RsvpFormFieldSettings eventUuid={uuid} />
            </AccordionContent>
          </AccordionItem>
        )}

        {canEdit && (
          <AccordionItem value="privacy-settings">
            <AccordionTrigger>Privacy & Sharing</AccordionTrigger>
            <AccordionContent>
              <PrivacySharingSettings eventUuid={uuid} />
            </AccordionContent>
          </AccordionItem>
        )}

        {canManageCollaborators && (
          <AccordionItem value="collaborators">
            <AccordionTrigger>Collaborators</AccordionTrigger>
            <AccordionContent>
              <CollaboratorsList eventUuid={uuid} />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

export function EventSettingsView({ uuid }: EventSettingsViewProps) {
  return (
    <QueryProvider>
      <EventSettingsContent uuid={uuid} />
    </QueryProvider>
  );
}

export default EventSettingsView;
