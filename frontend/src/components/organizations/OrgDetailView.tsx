import { useState } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { useOrganization, useOrgMembers, useOrgInvitations, useDeleteOrganization, useInviteMember, useRevokeInvitation, useUpdateMemberRole, useRemoveMember, useOrgEvents, useAssignEvent, useUnassignEvent, type OrgRole } from '@/hooks/use-organizations';
import { useEvents } from '@/hooks/use-events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { OrgRoleBadge } from './OrgRoleBadge';

interface OrgDetailViewProps {
  orgId: string;
}

function OrgDetailContent({ orgId }: OrgDetailViewProps) {
  const { data: org, isLoading } = useOrganization(orgId);
  const { data: members } = useOrgMembers(orgId);
  const { data: invitations } = useOrgInvitations(orgId);
  const inviteMember = useInviteMember(orgId);
  const revokeInvitation = useRevokeInvitation(orgId);
  const updateMemberRole = useUpdateMemberRole(orgId);
  const removeMember = useRemoveMember(orgId);
  const deleteOrg = useDeleteOrganization();

  const { data: orgEvents } = useOrgEvents(orgId);
  const assignEvent = useAssignEvent(orgId);
  const unassignEvent = useUnassignEvent(orgId);

  // Fetch user's personal events for the assign dialog (source=personal to get only unassigned)
  const { data: personalEventsData } = useEvents({ source: 'personal', limit: 100 });
  const personalEvents = personalEventsData?.events ?? [];
  // Filter to only events not already assigned to any org
  const unassignedEvents = personalEvents.filter((e) => !e.organizationId);

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('member');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assigningEventId, setAssigningEventId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!org) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Organization not found.</AlertDescription>
      </Alert>
    );
  }

  const isAdmin = org.userRole === 'admin';

  async function handleInvite() {
    setInviteError(null);
    try {
      await inviteMember.mutateAsync({ email: inviteEmail, role: inviteRole });
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRole('member');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite');
    }
  }

  async function handleDelete() {
    try {
      await deleteOrg.mutateAsync(orgId);
      window.location.href = '/dashboard/organizations';
    } catch {
      // error handled by mutation
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">{org.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground capitalize">{org.type}</span>
            <OrgRoleBadge role={org.userRole} />
          </div>
          {org.description && <p className="mt-2 text-muted-foreground">{org.description}</p>}
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          {isAdmin && <TabsTrigger value="invitations">Invitations</TabsTrigger>}
          {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={() => setShowInviteDialog(true)}>Invite Member</Button>
            </div>
          )}

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.userImage ?? undefined} />
                          <AvatarFallback>{(member.userName ?? member.userEmail).charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.userName ?? 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{member.userEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAdmin && member.userId !== org.createdBy ? (
                        <Select
                          value={member.role}
                          onValueChange={(val) => updateMemberRole.mutate({ memberId: member.id, role: val as OrgRole })}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <OrgRoleBadge role={member.role} />
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {member.userId !== org.createdBy && (
                          <Button variant="ghost" size="sm" onClick={() => removeMember.mutate(member.id)}>
                            Remove
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={() => setShowAssignDialog(true)}>Assign Event</Button>
            </div>
          )}

          {orgEvents && orgEvents.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgEvents.map((event) => (
                    <TableRow key={event.uuid}>
                      <TableCell>
                        <a
                          href={`/dashboard/events/${event.uuid}`}
                          className="font-medium hover:underline"
                        >
                          {event.title}
                        </a>
                        {event.eventType && (
                          <span className="ml-2 text-xs text-muted-foreground capitalize">
                            {event.eventType}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(event.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {event.status}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unassignEvent.mutate(event.uuid)}
                            disabled={unassignEvent.isPending}
                          >
                            Unassign
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card className="py-8 text-center">
              <CardContent>
                <p className="text-muted-foreground">No events assigned to this organization.</p>
                {isAdmin && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Use &quot;Assign Event&quot; to link your personal events to this organization.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="invitations" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowInviteDialog(true)}>Invite Member</Button>
            </div>

            {invitations && invitations.length > 0 ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{inv.email}</TableCell>
                        <TableCell><OrgRoleBadge role={inv.role} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => revokeInvitation.mutate(inv.id)}>
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <Card className="py-8 text-center">
                <CardContent>
                  <p className="text-muted-foreground">No pending invitations.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  Delete Organization
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {inviteError && (
              <Alert variant="destructive">
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(val) => setInviteRole(val as OrgRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviteMember.isPending || !inviteEmail}>
              {inviteMember.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete <strong>{org.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteOrg.isPending}>
              {deleteOrg.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Event Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={(open) => { setShowAssignDialog(open); setAssignError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Event to {org.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {assignError && (
              <Alert variant="destructive">
                <AlertDescription>{assignError}</AlertDescription>
              </Alert>
            )}
            {unassignedEvents.length > 0 ? (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {unassignedEvents.map((event) => (
                  <div
                    key={event.uuid}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.startDate).toLocaleDateString()}
                        {event.eventType && ` \u00B7 ${event.eventType}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        setAssignError(null);
                        setAssigningEventId(event.uuid);
                        try {
                          await assignEvent.mutateAsync(event.uuid);
                          setShowAssignDialog(false);
                        } catch (err) {
                          setAssignError(err instanceof Error ? err.message : 'Failed to assign');
                        } finally {
                          setAssigningEventId(null);
                        }
                      }}
                      disabled={assignEvent.isPending}
                    >
                      {assigningEventId === event.uuid ? 'Assigning...' : 'Assign'}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                You have no unassigned personal events to assign.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function OrgDetailView({ orgId }: OrgDetailViewProps) {
  return (
    <QueryProvider>
      <OrgDetailContent orgId={orgId} />
    </QueryProvider>
  );
}
