/**
 * Pending Invitations Banner
 *
 * Displays a banner for each pending organization invitation
 * so users never miss an invitation, regardless of how they
 * reached the dashboard.
 */

import { useState } from 'react';
import { usePendingInvitations } from '@/hooks/use-organizations';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, X } from 'lucide-react';

export function PendingInvitationsBanner() {
  const { data: invitations, isLoading } = usePendingInvitations();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (isLoading || !invitations || invitations.length === 0) {
    return null;
  }

  const visible = invitations.filter((inv) => !dismissed.has(inv.id));

  if (visible.length === 0) {
    return null;
  }

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  return (
    <div className="space-y-3">
      {visible.map((invitation) => (
        <Alert key={invitation.id} className="relative border-primary/30 bg-primary/5">
          <Mail className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              {invitation.invitedByName
                ? <><strong>{invitation.invitedByName}</strong> invited you to join </>
                : <>You've been invited to join </>}
              <strong>{invitation.organizationName}</strong>
              {' as '}
              <Badge variant="outline" className="ml-1 align-middle">
                {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
              </Badge>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" asChild>
                <a href={`/invitations/${invitation.token}`}>View Invitation</a>
              </Button>
              <button
                type="button"
                onClick={() => handleDismiss(invitation.id)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
