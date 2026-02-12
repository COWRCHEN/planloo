/**
 * Admin User List
 *
 * Displays a paginated, filterable table of platform users.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminUsers, type ListAdminUsersQuery } from '@/hooks/use-admin';
import { AdminUserFilters } from './AdminUserFilters';

const PAGE_SIZE = 20;

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

export function AdminUserList() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [offset, setOffset] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset offset on filter change
  useEffect(() => {
    setOffset(0);
  }, [roleFilter, statusFilter]);

  const filters: Partial<ListAdminUsersQuery> = {
    limit: PAGE_SIZE,
    offset,
  };
  if (debouncedSearch) filters.search = debouncedSearch;
  if (roleFilter !== 'all') filters.platformRole = roleFilter as 'super_admin' | 'operator' | 'user';
  if (statusFilter === 'active') filters.isActive = 'true';
  if (statusFilter === 'suspended') filters.isActive = 'false';

  const { data, isLoading, error } = useAdminUsers(filters);

  const total = data?.meta?.total ?? 0;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  return (
    <div className="space-y-4">
      <AdminUserFilters
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive">Failed to load users</p>
            </div>
          ) : data?.users.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name || 'Unnamed'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(user.platformRole)}>
                        {roleLabel(user.platformRole)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="outline" className="border-green-500 text-green-600">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-500 text-red-600">Suspended</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/admin/users/${user.id}`}>View</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
