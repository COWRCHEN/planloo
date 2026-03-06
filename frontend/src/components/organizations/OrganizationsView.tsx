import { useState } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { useOrganizations } from '@/hooks/use-organizations';
import { useBilling } from '@/hooks/use-billing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import { OrgRoleBadge } from './OrgRoleBadge';

function OrganizationsContent() {
  const { data: orgs, isLoading } = useOrganizations();
  const { data: billingData } = useBilling();
  const [showOrgLimitDialog, setShowOrgLimitDialog] = useState(false);

  const maxOrgs = billingData?.limits.maxOrganizations ?? null;
  const totalOrgs = billingData?.usage.totalOrganizations ?? 0;
  const orgBlocked = maxOrgs === 0;
  const atOrgLimit = maxOrgs !== null && maxOrgs > 0 && totalOrgs >= maxOrgs;
  const orgLimitReached = orgBlocked || atOrgLimit;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-4 w-24" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!orgs || orgs.length === 0) {
    return (
      <>
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-muted-foreground mb-4">You don't belong to any organizations yet.</p>
            {orgLimitReached ? (
              <Button onClick={() => setShowOrgLimitDialog(true)}>Create Organization</Button>
            ) : (
              <Button asChild>
                <a href="/dashboard/organizations/new">Create Organization</a>
              </Button>
            )}
          </CardContent>
        </Card>
        <Dialog open={showOrgLimitDialog} onOpenChange={setShowOrgLimitDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Plan limit reached</DialogTitle>
            </DialogHeader>
            <UpgradePrompt
              error={{
                code: 'ORG_LIMIT_EXCEEDED',
                message: orgBlocked
                  ? 'Your current plan does not support organizations.'
                  : `You've reached the limit of ${maxOrgs} organization${maxOrgs === 1 ? '' : 's'} on your plan.`,
                upgradeUrl: '/dashboard/billing',
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          {orgLimitReached ? (
            <Button onClick={() => setShowOrgLimitDialog(true)}>Create Organization</Button>
          ) : (
            <Button asChild>
              <a href="/dashboard/organizations/new">Create Organization</a>
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <a key={org.id} href={`/dashboard/organizations/${org.id}`}>
              <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold">{org.name}</CardTitle>
                  <OrgRoleBadge role={org.userRole} />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="capitalize">{org.type}</span>
                    <span>{org.memberCount} {org.memberCount === 1 ? 'member' : 'members'}</span>
                  </div>
                  {org.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{org.description}</p>
                  )}
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
      <Dialog open={showOrgLimitDialog} onOpenChange={setShowOrgLimitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan limit reached</DialogTitle>
          </DialogHeader>
          <UpgradePrompt
            error={{
              code: 'ORG_LIMIT_EXCEEDED',
              message: orgBlocked
                ? 'Your current plan does not support organizations.'
                : `You've reached the limit of ${maxOrgs} organization${maxOrgs === 1 ? '' : 's'} on your plan.`,
              upgradeUrl: '/dashboard/billing',
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function OrganizationsView() {
  return (
    <QueryProvider>
      <OrganizationsContent />
    </QueryProvider>
  );
}
