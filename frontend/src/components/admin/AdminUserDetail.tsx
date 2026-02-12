/**
 * Admin User Detail
 *
 * Displays user info with admin action buttons (role change, suspend/unsuspend).
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSession } from '@/hooks/use-auth';
import {
  useAdminUserDetail,
  useChangeUserRole,
  useSuspendUser,
  useUnsuspendUser,
} from '@/hooks/use-admin';

interface AdminUserDetailProps {
  userId: string;
}

function roleBadgeVariant(role: string) {
  switch (role) {
    case 'super_admin':
      return 'destructive' as const;
    case 'operator':
      return 'default' as const;
    default:
      return 'secondary' as const;
  }
}

function roleLabel(role: string) {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'operator':
      return 'Operator';
    default:
      return 'User';
  }
}

export function AdminUserDetail({ userId }: AdminUserDetailProps) {
  const { data: session } = useSession();
  const { data: user, isLoading, error } = useAdminUserDetail(userId);
  const changeRole = useChangeUserRole(userId);
  const suspendUser = useSuspendUser(userId);
  const unsuspendUser = useUnsuspendUser(userId);

  const [selectedRole, setSelectedRole] = useState('');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [unsuspendDialogOpen, setUnsuspendDialogOpen] = useState(false);

  const isSelf = session?.user.id === userId;
  const isSuperAdmin = session?.user.platformRole === 'super_admin';
  const isOperator = session?.user.platformRole === 'operator';
  const canChangeRole = isSuperAdmin && !isSelf;
  const canSuspend = !isSelf && user?.isActive && !(isOperator && user?.platformRole === 'super_admin');
  const canUnsuspend = !isSelf && user && !user.isActive;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-60" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">
            {error?.message || 'User not found'}
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <a href="/admin/users">Back to Users</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user.email[0] ?? '?').toUpperCase();

  const handleRoleChange = async () => {
    if (!selectedRole) return;
    await changeRole.mutateAsync(selectedRole as 'super_admin' | 'operator' | 'user');
    setRoleDialogOpen(false);
    setSelectedRole('');
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) return;
    await suspendUser.mutateAsync(suspendReason.trim());
    setSuspendDialogOpen(false);
    setSuspendReason('');
  };

  const handleUnsuspend = async () => {
    await unsuspendUser.mutateAsync();
    setUnsuspendDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <a href="/admin/users">
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </a>
        </Button>
      </div>

      {/* Suspended alert */}
      {!user.isActive && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Account Suspended</strong>
            {user.suspendedReason && <> &mdash; {user.suspendedReason}</>}
            {user.suspendedAt && (
              <span className="ml-2 text-xs opacity-75">
                (suspended {new Date(user.suspendedAt).toLocaleDateString()})
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* User info card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar className="h-16 w-16">
              {user.image && <AvatarImage src={user.image} alt={user.name || 'User'} />}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-bold">{user.name || 'Unnamed'}</h2>
                <p className="text-muted-foreground">{user.email}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant={roleBadgeVariant(user.platformRole)}>
                  {roleLabel(user.platformRole)}
                </Badge>
                {user.isActive ? (
                  <Badge variant="outline" className="border-green-500 text-green-600">Active</Badge>
                ) : (
                  <Badge variant="outline" className="border-red-500 text-red-600">Suspended</Badge>
                )}
                {user.emailVerified && (
                  <Badge variant="outline">Email Verified</Badge>
                )}
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                {user.phone && (
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    {user.phone}
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Events:</span>{' '}
                  {user.eventCount}
                </div>
                <div>
                  <span className="text-muted-foreground">Joined:</span>{' '}
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {!isSelf && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">Actions</h3>
            <div className="flex flex-wrap gap-3">
              {/* Role change (super_admin only) */}
              {canChangeRole && (
                <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Change Role</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change User Role</DialogTitle>
                      <DialogDescription>
                        Change the platform role for {user.name || user.email}.
                        Current role: {roleLabel(user.platformRole)}.
                      </DialogDescription>
                    </DialogHeader>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="operator">Operator</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleRoleChange}
                        disabled={!selectedRole || selectedRole === user.platformRole || changeRole.isPending}
                      >
                        {changeRole.isPending ? 'Changing...' : 'Confirm'}
                      </Button>
                    </DialogFooter>
                    {changeRole.isError && (
                      <p className="text-sm text-destructive">{changeRole.error.message}</p>
                    )}
                  </DialogContent>
                </Dialog>
              )}

              {/* Suspend */}
              {canSuspend && (
                <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Suspend User</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Suspend User</DialogTitle>
                      <DialogDescription>
                        Suspend {user.name || user.email}. They will be unable to access the platform.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      placeholder="Reason for suspension (required)"
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleSuspend}
                        disabled={!suspendReason.trim() || suspendUser.isPending}
                      >
                        {suspendUser.isPending ? 'Suspending...' : 'Suspend'}
                      </Button>
                    </DialogFooter>
                    {suspendUser.isError && (
                      <p className="text-sm text-destructive">{suspendUser.error.message}</p>
                    )}
                  </DialogContent>
                </Dialog>
              )}

              {/* Unsuspend */}
              {canUnsuspend && (
                <Dialog open={unsuspendDialogOpen} onOpenChange={setUnsuspendDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Unsuspend User</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Unsuspend User</DialogTitle>
                      <DialogDescription>
                        Restore access for {user.name || user.email}.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setUnsuspendDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUnsuspend}
                        disabled={unsuspendUser.isPending}
                      >
                        {unsuspendUser.isPending ? 'Unsuspending...' : 'Confirm'}
                      </Button>
                    </DialogFooter>
                    {unsuspendUser.isError && (
                      <p className="text-sm text-destructive">{unsuspendUser.error.message}</p>
                    )}
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
