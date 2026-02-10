/**
 * Send Invitations Dialog
 *
 * Allows sending RSVP invitation emails to eligible guests.
 * Shows a list of guests with email addresses, lets the user
 * select recipients, and sends invitations sequentially.
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
import { useResendRsvp, type GuestResponse } from '@/hooks/use-guests';

interface SendInvitationsDialogProps {
  eventUuid: string;
  guests: GuestResponse[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SendStatus = 'idle' | 'sending' | 'done';

interface SendResult {
  guestUuid: string;
  name: string;
  email: string;
  success: boolean;
  error?: string | undefined;
}

export function SendInvitationsDialog({
  eventUuid,
  guests,
  open,
  onOpenChange,
}: SendInvitationsDialogProps) {
  const resendRsvp = useResendRsvp(eventUuid);
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [results, setResults] = useState<SendResult[]>([]);
  const [progress, setProgress] = useState(0);

  // Eligible guests: have email, not yet confirmed/declined
  const eligibleGuests = useMemo(
    () =>
      guests.filter(
        (g) => g.email && (g.rsvpStatus === 'pending' || g.rsvpStatus === 'invited')
      ),
    [guests]
  );

  const allWithEmail = useMemo(() => guests.filter((g) => g.email), [guests]);

  const handleSendAll = async () => {
    if (eligibleGuests.length === 0) return;

    setSendStatus('sending');
    setResults([]);
    setProgress(0);

    const sendResults: SendResult[] = [];

    for (const [i, guest] of eligibleGuests.entries()) {
      const name = [guest.firstName, guest.lastName].filter(Boolean).join(' ');
      try {
        const result = await resendRsvp.mutateAsync(guest.uuid);
        sendResults.push({
          guestUuid: guest.uuid,
          name,
          email: guest.email!,
          success: result?.sent ?? false,
          error: result?.sent ? undefined : 'Email delivery failed',
        });
      } catch (err) {
        sendResults.push({
          guestUuid: guest.uuid,
          name,
          email: guest.email!,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
      setProgress(i + 1);
      setResults([...sendResults]);
    }

    setSendStatus('done');
  };

  const handleClose = () => {
    if (sendStatus === 'sending') return;
    setSendStatus('idle');
    setResults([]);
    setProgress(0);
    onOpenChange(false);
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

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
                <span className="text-muted-foreground">
                  {progress} / {eligibleGuests.length}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${(progress / eligibleGuests.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {sendStatus === 'done' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              {successCount > 0 && (
                <Alert>
                  <AlertDescription>
                    {successCount} invitation{successCount !== 1 ? 's' : ''} sent successfully.
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

            {failCount > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-md border text-sm">
                {results
                  .filter((r) => !r.success)
                  .map((r) => (
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
                disabled={eligibleGuests.length === 0}
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
