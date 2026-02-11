/**
 * Send Invitations Dialog
 *
 * Sends RSVP invitation emails using the batch endpoint.
 * Shows warnings when RSVP is disabled, displays deadline info,
 * and updates guest status badges from pending -> invited.
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSendInvitations, type GuestResponse } from '@/hooks/use-guests';
import { useRsvpSettings } from '@/hooks/use-events';

interface SendInvitationsDialogProps {
  eventUuid: string;
  guests: GuestResponse[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SendStatus = 'idle' | 'sending' | 'done';

export function SendInvitationsDialog({
  eventUuid,
  guests,
  open,
  onOpenChange,
}: SendInvitationsDialogProps) {
  const sendInvitations = useSendInvitations(eventUuid);
  const { data: rsvpSettings } = useRsvpSettings(eventUuid);
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');

  // Eligible guests: have email, not yet confirmed/declined
  const eligibleGuests = useMemo(
    () =>
      guests.filter(
        (g) => g.email && (g.rsvpStatus === 'pending' || g.rsvpStatus === 'invited')
      ),
    [guests]
  );

  const allWithEmail = useMemo(() => guests.filter((g) => g.email), [guests]);

  const rsvpDisabled = rsvpSettings && !rsvpSettings.enableRsvp;
  const rsvpDeadline = rsvpSettings?.rsvpDeadline
    ? new Date(rsvpSettings.rsvpDeadline).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const handleSendAll = async () => {
    if (eligibleGuests.length === 0) return;

    setSendStatus('sending');

    try {
      await sendInvitations.mutateAsync('all-eligible');
    } catch {
      // Error is available via sendInvitations.error
    }

    setSendStatus('done');
  };

  const handleClose = () => {
    if (sendStatus === 'sending') return;
    setSendStatus('idle');
    sendInvitations.reset();
    onOpenChange(false);
  };

  const result = sendInvitations.data;
  const sentCount = result?.sent ?? 0;
  const failCount = result?.failed?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send RSVP Invitations</DialogTitle>
          <DialogDescription>
            Send invitation emails to guests who haven't responded yet.
          </DialogDescription>
        </DialogHeader>

        {sendStatus === 'idle' && (
          <div className="space-y-4">
            {/* RSVP Disabled Warning */}
            {rsvpDisabled && (
              <Alert variant="destructive">
                <AlertDescription>
                  RSVP is disabled for this event. Enable it in{' '}
                  <a
                    href={`/dashboard/events/${eventUuid}/settings`}
                    className="underline font-medium"
                  >
                    event settings
                  </a>{' '}
                  before sending invitations.
                </AlertDescription>
              </Alert>
            )}

            {/* Deadline Info */}
            {rsvpDeadline && !rsvpDisabled && (
              <Alert>
                <AlertDescription>
                  RSVP deadline: <span className="font-medium">{rsvpDeadline}</span>
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-md border px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total guests</span>
                <span className="font-medium">{guests.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">With email address</span>
                <span className="font-medium">{allWithEmail.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Eligible (pending/invited)</span>
                <Badge variant="default" className="text-xs">{eligibleGuests.length}</Badge>
              </div>
            </div>

            {eligibleGuests.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No eligible guests to send invitations to. Guests must have an email address
                  and a pending or invited RSVP status.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-md border">
                {eligibleGuests.map((guest) => (
                  <div
                    key={guest.uuid}
                    className="flex items-center justify-between border-b px-3 py-2 last:border-b-0 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {[guest.firstName, guest.lastName].filter(Boolean).join(' ')}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{guest.email}</p>
                    </div>
                    <Badge variant="secondary" className="ml-2 text-xs shrink-0">
                      {guest.rsvpStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {sendStatus === 'sending' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Sending invitations...</span>
                <span className="text-muted-foreground">{eligibleGuests.length} guests</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary animate-pulse w-full" />
              </div>
            </div>
          </div>
        )}

        {sendStatus === 'done' && (
          <div className="space-y-4">
            {sendInvitations.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {(sendInvitations.error as Error)?.message || 'Failed to send invitations.'}
                </AlertDescription>
              </Alert>
            )}

            {!sendInvitations.isError && (
              <div className="space-y-3">
                {sentCount > 0 && (
                  <Alert>
                    <AlertDescription>
                      {sentCount} invitation{sentCount !== 1 ? 's' : ''} sent successfully.
                      Guest status updated to "invited".
                    </AlertDescription>
                  </Alert>
                )}
                {failCount > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {failCount} invitation{failCount !== 1 ? 's' : ''} failed to send.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {failCount > 0 && result?.failed && (
              <div className="max-h-32 overflow-y-auto rounded-md border text-sm">
                {result.failed.map((r) => (
                  <div key={r.guestUuid} className="border-b px-3 py-2 last:border-b-0">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-destructive">{r.error}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {sendStatus === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSendAll}
                disabled={eligibleGuests.length === 0 || !!rsvpDisabled}
              >
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Send to {eligibleGuests.length} guest{eligibleGuests.length !== 1 ? 's' : ''}
              </Button>
            </>
          )}
          {sendStatus === 'sending' && (
            <Button disabled>
              Sending...
            </Button>
          )}
          {sendStatus === 'done' && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
