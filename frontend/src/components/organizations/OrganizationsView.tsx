import { QueryProvider } from '@/components/providers/QueryProvider';
import { useOrganizations } from '@/hooks/use-organizations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OrgRoleBadge } from './OrgRoleBadge';

function OrganizationsContent() {
  const { data: orgs, isLoading } = useOrganizations();

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
      <Card className="py-12 text-center">
        <CardContent>
          <p className="text-muted-foreground mb-4">You don't belong to any organizations yet.</p>
          <Button asChild>
            <a href="/dashboard/organizations/new">Create Organization</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <a href="/dashboard/organizations/new">Create Organization</a>
        </Button>
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
  );
}

export function OrganizationsView() {
  return (
    <QueryProvider>
      <OrganizationsContent />
    </QueryProvider>
  );
}
