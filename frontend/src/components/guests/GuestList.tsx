/**
 * Guest List
 *
 * Main guest list component with filters, stats, and table.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { GuestStats } from './GuestStats';
import { GuestFilters } from './GuestFilters';
import { GuestTable } from './GuestTable';
import { GuestForm } from './GuestForm';
import { DeleteGuestDialog } from './DeleteGuestDialog';
import { GuestImportDialog } from './GuestImportDialog';
import { GuestExportButton } from './GuestExportButton';
import { EmptyGuestState } from './EmptyGuestState';
import {
  useGuests,
  useGuestStats,
  useCreateGuest,
  useUpdateGuest,
  useDeleteGuest,
  useCheckInGuest,
  useResendRsvp,
  useImportGuests,
  useUpdateRsvpStatus,
  type GuestResponse,
  type GuestCategory,
  type RsvpStatus,
  type CreateGuestInput,
} from '@/hooks/use-guests';

const ITEMS_PER_PAGE = 50;

interface GuestListProps {
  eventUuid: string;
}

export function GuestList({ eventUuid }: GuestListProps) {
  // Filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<GuestCategory | undefined>(undefined);
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus | undefined>(undefined);
  const [page, setPage] = useState(0);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestResponse | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<GuestResponse | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  // Build filters
  const filters = {
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(category && { category }),
    ...(rsvpStatus && { rsvpStatus }),
    limit: ITEMS_PER_PAGE,
    offset: page * ITEMS_PER_PAGE,
  };

  // Queries
  const { data, isLoading: isLoadingGuests } = useGuests(eventUuid, filters);
  const { data: stats, isLoading: isLoadingStats } = useGuestStats(eventUuid);

  // Mutations
  const createGuest = useCreateGuest(eventUuid);
  const deleteGuest = useDeleteGuest(eventUuid);
  const checkInGuest = useCheckInGuest(eventUuid);
  const resendRsvp = useResendRsvp(eventUuid);
  const importGuests = useImportGuests(eventUuid);
  const updateRsvpStatus = useUpdateRsvpStatus(eventUuid);

  // For update mutation, we need the guest UUID
  const updateGuest = useUpdateGuest(eventUuid, editingGuest?.uuid ?? '');

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategory(undefined);
    setRsvpStatus(undefined);
    setPage(0);
  };

  const handleAddGuest = () => {
    setEditingGuest(null);
    setFormOpen(true);
  };

  const handleEditGuest = (guest: GuestResponse) => {
    setEditingGuest(guest);
    setFormOpen(true);
  };

  const handleDeleteGuest = (guest: GuestResponse) => {
    setGuestToDelete(guest);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: CreateGuestInput) => {
    if (editingGuest) {
      await updateGuest.mutateAsync(data);
    } else {
      await createGuest.mutateAsync(data);
    }
    setFormOpen(false);
    setEditingGuest(null);
  };

  const handleConfirmDelete = async () => {
    if (guestToDelete) {
      await deleteGuest.mutateAsync(guestToDelete.uuid);
      setDeleteDialogOpen(false);
      setGuestToDelete(null);
    }
  };

  const handleCheckIn = async (guest: GuestResponse) => {
    await checkInGuest.mutateAsync(guest.uuid);
  };

  const handleResendRsvp = async (guest: GuestResponse) => {
    await resendRsvp.mutateAsync(guest.uuid);
  };

  const handleUpdateRsvpStatus = async (guest: GuestResponse, status: RsvpStatus) => {
    await updateRsvpStatus.mutateAsync({ guestUuid: guest.uuid, rsvpStatus: status });
  };

  const handleImport = async (csvContent: string) => {
    const result = await importGuests.mutateAsync(csvContent);
    return result;
  };

  const hasFilters = !!debouncedSearch || !!category || !!rsvpStatus;
  const totalPages = Math.ceil((data?.meta?.total ?? 0) / ITEMS_PER_PAGE);
  const guests = data?.guests ?? [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <GuestStats stats={stats} isLoading={isLoadingStats} />

      {/* Actions and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <GuestFilters
          search={search}
          category={category}
          rsvpStatus={rsvpStatus}
          onSearchChange={handleSearchChange}
          onCategoryChange={(c) => {
            setCategory(c);
            setPage(0);
          }}
          onRsvpStatusChange={(s) => {
            setRsvpStatus(s);
            setPage(0);
          }}
          onClearFilters={handleClearFilters}
        />

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Import CSV
          </Button>
          <GuestExportButton eventUuid={eventUuid} disabled={guests.length === 0} />
          <Button onClick={handleAddGuest}>
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Guest
          </Button>
        </div>
      </div>

      {/* Guest Table or Empty State */}
      {!isLoadingGuests && guests.length === 0 ? (
        <EmptyGuestState
          hasFilters={hasFilters}
          onClearFilters={handleClearFilters}
          onAddGuest={handleAddGuest}
        />
      ) : (
        <>
          <GuestTable
            guests={guests}
            isLoading={isLoadingGuests}
            onEdit={handleEditGuest}
            onDelete={handleDeleteGuest}
            onCheckIn={handleCheckIn}
            onResendRsvp={handleResendRsvp}
            onUpdateRsvpStatus={handleUpdateRsvpStatus}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="px-4 text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <GuestForm
        open={formOpen}
        onOpenChange={setFormOpen}
        guest={editingGuest}
        onSubmit={handleFormSubmit}
        isSubmitting={createGuest.isPending || updateGuest.isPending}
      />

      <DeleteGuestDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        guest={guestToDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteGuest.isPending}
      />

      <GuestImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        isImporting={importGuests.isPending}
      />
    </div>
  );
}
