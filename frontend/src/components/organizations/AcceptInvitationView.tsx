import { useState } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { useInvitationDetails, useAcceptInvitation } from '@/hooks/use-organizations';
import { useSession } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { OrgRoleBadge } from './OrgRoleBadge';

interface AcceptInvitationViewProps {
  token: string;
}

function AcceptInvitationContent({ token }: AcceptInvitationViewProps) {
  const { data: invitation, isLoading, error: fetchError } = useInvitationDetails(token);
  const { data: session, isLoading: isSessionLoading } = useSession();
  const acceptInvitation = useAcceptInvitation();
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!session;

  if (isLoading || isSessionLoading) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-4 w-64" /></CardContent>
      </Card>
    );
  }

  if (fetchError || !invitation) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription>
              {fetchError instanceof Error ? fetchError.message : 'This invitation is invalid, expired, or has already been accepted.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  async function handleAccept() {
    setError(null);
    try {
      const result = await acceptInvitation.mutateAsync(token);
      if (result) {
        window.location.href = `/dashboard/organizations/${result.organizationId}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    }
  }

  // Build login/signup URLs that redirect back to this invitation page after auth
  const returnUrl = encodeURIComponent(`/invitations/${token}`);

  return (
    <Card className="max-w-md mx-auto mt-12">
      <CardHeader>
        <CardTitle>Organization Invitation</CardTitle>
        {!isAuthenticated && (
          <CardDescription>Log in or create an account to accept this invitation.</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p>
          You've been invited to join <strong>{invitation.organizationName}</strong> as a:
        </p>
        <OrgRoleBadge role={invitation.role} />
        {invitation.invitedByName && (
          <p className="text-sm text-muted-foreground">Invited by {invitation.invitedByName}</p>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        {isAuthenticated ? (
          <>
            <Button variant="outline" asChild>
              <a href="/dashboard">Decline</a>
            </Button>
            <Button onClick={handleAccept} disabled={acceptInvitation.isPending}>
              {acceptInvitation.isPending ? 'Accepting...' : 'Accept Invitation'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" asChild>
              <a href={`/register?returnUrl=${returnUrl}`}>Create Account</a>
            </Button>
            <Button asChild>
              <a href={`/login?returnUrl=${returnUrl}`}>Log In</a>
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

export function AcceptInvitationView({ token }: AcceptInvitationViewProps) {
  return (
    <QueryProvider>
      <AcceptInvitationContent token={token} />
    </QueryProvider>
  );
}
