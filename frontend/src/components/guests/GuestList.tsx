/**
 * Guest List
 *
 * Main guest list component with filters, stats, and table.
 * Supports event-type-specific fields, optional fields, and custom fields.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { GuestStats } from './GuestStats';
import { GuestFilters } from './GuestFilters';
import { GuestTable } from './GuestTable';
import { DeleteGuestDialog } from './DeleteGuestDialog';
import { GuestAuditDialog } from './GuestAuditDialog';
import { GuestImportDialog } from './GuestImportDialog';
import { GuestExportButton } from './GuestExportButton';
import { EmptyGuestState } from './EmptyGuestState';
import { GuestFieldSettingsDialog } from './GuestFieldSettings';
import { CustomFieldManagerDialog } from './CustomFieldManager';
import { useEvent } from '@/hooks/use-events';
import {
  useGuests,
  useGuestStats,
  useGuestSettings,
  useDeleteGuest,
  useCheckInGuest,
  useResendRsvp,
  useImportGuests,
  useUpdateRsvpStatus,
  type GuestResponse,
  type RsvpStatus,
  type ListGuestsQuery,
} from '@/hooks/use-guests';

const ITEMS_PER_PAGE = 50;

interface GuestListProps {
  eventUuid: string;
}

export function GuestList({ eventUuid }: GuestListProps) {
  // Filter state - now using ListGuestsQuery type for all filters
  const [filters, setFilters] = useState<Partial<ListGuestsQuery>>({});
  const [page, setPage] = useState(0);

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<GuestResponse | null>(null);
  const [guestForAudit, setGuestForAudit] = useState<GuestResponse | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [customFieldsDialogOpen, setCustomFieldsDialogOpen] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  const handleSearchChange = useCallback((value: string | undefined) => {
    setFilters((prev) => ({ ...prev, search: value }));
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(value ?? '');
      setPage(0);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  // Build query filters with pagination
  const queryFilters: Partial<ListGuestsQuery> = {
    ...filters,
    search: debouncedSearch || undefined,
    limit: ITEMS_PER_PAGE,
    offset: page * ITEMS_PER_PAGE,
  };

  // Queries - including event and guest settings
  const { data: event } = useEvent(eventUuid);
  const { data: guestSettings } = useGuestSettings(eventUuid);
  const { data, isLoading: isLoadingGuests } = useGuests(eventUuid, queryFilters);
  const { data: stats, isLoading: isLoadingStats } = useGuestStats(eventUuid);

  // Derive event type from event data
  const eventType = event?.eventType ?? null;

  // Mutations
  const deleteGuest = useDeleteGuest(eventUuid);
  const checkInGuest = useCheckInGuest(eventUuid);
  const resendRsvp = useResendRsvp(eventUuid);
  const importGuests = useImportGuests(eventUuid);
  const updateRsvpStatus = useUpdateRsvpStatus(eventUuid);

  const handleClearFilters = () => {
    setFilters({});
    setDebouncedSearch('');
    setPage(0);
  };

  const handleFilterChange = (newFilters: Partial<ListGuestsQuery>) => {
    // Handle search separately for debouncing
    if ('search' in newFilters) {
      handleSearchChange(newFilters.search);
      const { search: _, ...rest } = newFilters;
      if (Object.keys(rest).length > 0) {
        setFilters((prev) => ({ ...prev, ...rest }));
        setPage(0);
      }
    } else {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      setPage(0);
    }
  };

  const handleAddGuest = () => {
    window.location.href = `/dashboard/events/${eventUuid}/guests/new`;
  };

  const handleEditGuest = (guest: GuestResponse) => {
    window.location.href = `/dashboard/events/${eventUuid}/guests/${guest.uuid}/edit`;
  };

  const handleDeleteGuest = (guest: GuestResponse) => {
    setGuestToDelete(guest);
    setDeleteDialogOpen(true);
  };

  const handleAuditGuest = (guest: GuestResponse) => {
    setGuestForAudit(guest);
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

  // Check if any filters are active
  const hasFilters = Object.values(filters).some((v) => v !== undefined) || !!debouncedSearch;
  const totalPages = Math.ceil((data?.meta?.total ?? 0) / ITEMS_PER_PAGE);
  const guests = data?.guests ?? [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <GuestStats stats={stats} isLoading={isLoadingStats} />

      {/* Actions and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <GuestFilters
          filters={{ ...filters, search: filters.search ?? debouncedSearch }}
          onChange={handleFilterChange}
          onReset={handleClearFilters}
          eventType={eventType}
          guestSettings={guestSettings}
        />

        <div className="flex items-center gap-2">
          {/* Settings Dropdown */}
          <div className="relative">
            <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Fields
            </Button>
          </div>

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
            Import
          </Button>
          <GuestExportButton eventUuid={eventUuid} disabled={guests.length === 0} />
          <Button asChild>
            <a href={`/dashboard/events/${eventUuid}/guests/new`}>
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
            </a>
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
            onAudit={handleAuditGuest}
            eventType={eventType}
            guestSettings={guestSettings}
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
      <DeleteGuestDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        guest={guestToDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteGuest.isPending}
      />

      <GuestAuditDialog
        eventUuid={eventUuid}
        guest={guestForAudit}
        guestSettings={guestSettings}
        open={!!guestForAudit}
        onOpenChange={(open) => !open && setGuestForAudit(null)}
      />

      <GuestImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        isImporting={importGuests.isPending}
      />

      {/* Field Settings Dialog */}
      <GuestFieldSettingsDialog
        eventUuid={eventUuid}
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />

      {/* Custom Fields Manager Dialog */}
      <CustomFieldManagerDialog
        eventUuid={eventUuid}
        open={customFieldsDialogOpen}
        onOpenChange={setCustomFieldsDialogOpen}
      />
    </div>
  );
}
