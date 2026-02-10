/**
 * Event Notifications View
 *
 * Per-event email notification settings and email history.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { EmailHistory } from '@/components/settings/EmailHistory';
import {
  useEvent,
  useRsvpSettings,
  useUpdateRsvpSettings,
} from '@/hooks/use-events';
import { useSession } from '@/hooks/use-auth';

interface NotificationsViewProps {
  uuid: string;
}

function NotificationsContent({ uuid }: NotificationsViewProps) {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(uuid);
  const { data: settings, isLoading: settingsLoading } = useRsvpSettings(uuid);
  const updateSettings = useUpdateRsvpSettings(uuid);

  if (sessionLoading || eventLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to view notifications.</p>
          <Button asChild className="mt-4">
            <a href="/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (eventError || !event) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">{eventError ? 'Failed to load event.' : 'Event not found.'}</p>
          {eventError && <p className="mt-2 text-sm text-muted-foreground">{eventError.message}</p>}
          <Button asChild variant="outline" className="mt-4">
            <a href="/dashboard/events">Back to Events</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleToggle = (key: 'sendRsvpInvitation' | 'sendRsvpConfirmation') => (checked: boolean) => {
    updateSettings.mutate({ [key]: checked });
  };

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
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">{event.title}</p>
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

      {/* Email Notification Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Control which emails are sent to guests for this event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-0 divide-y">
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="space-y-0.5 pr-4">
                  <Label htmlFor="sendRsvpInvitation" className="text-sm font-medium">
                    Send invitation emails
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send an email to guests when you share RSVP invitations
                  </p>
                </div>
                <Switch
                  id="sendRsvpInvitation"
                  checked={settings?.sendRsvpInvitation ?? true}
                  onCheckedChange={handleToggle('sendRsvpInvitation')}
                  disabled={updateSettings.isPending}
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="space-y-0.5 pr-4">
                  <Label htmlFor="sendRsvpConfirmation" className="text-sm font-medium">
                    Send confirmation emails
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send a confirmation email to guests after they respond to your invitation
                  </p>
                </div>
                <Switch
                  id="sendRsvpConfirmation"
                  checked={settings?.sendRsvpConfirmation ?? true}
                  onCheckedChange={handleToggle('sendRsvpConfirmation')}
                  disabled={updateSettings.isPending}
                />
              </div>
            </div>
          )}

          <div className="mt-4 rounded-md border border-muted bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Authentication emails (verification, password reset) are always sent and cannot be disabled.
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Email History */}
      <Card>
        <CardContent className="pt-6">
          <EmailHistory eventUuid={uuid} />
        </CardContent>
      </Card>
    </div>
  );
}

export function NotificationsView({ uuid }: NotificationsViewProps) {
  return (
    <QueryProvider>
      <NotificationsContent uuid={uuid} />
    </QueryProvider>
  );
}
