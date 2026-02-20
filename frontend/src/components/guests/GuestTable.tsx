/**
 * Guest Table
 *
 * Table component for displaying guest list with actions.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { GuestCategoryBadge } from './GuestCategoryBadge';
import { RsvpStatusBadge } from './RsvpStatusBadge';
import { buildRsvpUrl, type GuestResponse, type GuestSettingsResponse, type RsvpStatus, RSVP_STATUSES } from '@/hooks/use-guests';

interface GuestTableProps {
  guests: GuestResponse[];
  isLoading: boolean;
  onEdit: (guest: GuestResponse) => void;
  onDelete: (guest: GuestResponse) => void;
  onCheckIn: (guest: GuestResponse) => void;
  onResendRsvp: (guest: GuestResponse) => void;
  onUpdateRsvpStatus?: (guest: GuestResponse, status: RsvpStatus) => void;
  onAudit?: (guest: GuestResponse) => void;
  eventType?: string | null;
  guestSettings?: GuestSettingsResponse;
  sendingRsvpUuid?: string | null | undefined;
}

function TableSkeleton() {
  return (
    <TableBody>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-5 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-12" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export function GuestTable({
  guests,
  isLoading,
  onEdit,
  onDelete,
  onCheckIn,
  onResendRsvp,
  onUpdateRsvpStatus,
  onAudit,
  eventType: _eventType,
  guestSettings,
  sendingRsvpUuid,
}: GuestTableProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const rsvpStatusLabels: Record<RsvpStatus, string> = {
    pending: 'Pending',
    invited: 'Invited',
    confirmed: 'Confirmed',
    declined: 'Declined',
    maybe: 'Maybe',
  };

  const handleCopyRsvpLink = async (guest: GuestResponse) => {
    const url = buildRsvpUrl(guest.rsvpToken);
    await navigator.clipboard.writeText(url);
    setCopiedToken(guest.rsvpToken);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const formatName = (guest: GuestResponse) => {
    return guest.lastName
      ? `${guest.firstName} ${guest.lastName}`
      : guest.firstName;
  };

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            {guestSettings?.enableCategory && <TableHead>Category</TableHead>}
            <TableHead>RSVP</TableHead>
            {guestSettings?.enableAccommodation && <TableHead>Accommodation</TableHead>}
            <TableHead>Check-in</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>

        {isLoading ? (
          <TableSkeleton />
        ) : (
          <TableBody>
            {guests.map((guest) => (
              <TableRow key={guest.uuid}>
                <TableCell className="font-medium">
                  {formatName(guest)}
                  {guest.plusOnesCount > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground" title={
                      (guest.plusOnesCountAdults != null || guest.plusOnesCountChildren != null)
                        ? `${guest.plusOnesCountAdults ?? 0} adults, ${guest.plusOnesCountChildren ?? 0} children`
                        : undefined
                    }>
                      +{guest.plusOnesCount}
                      {(guest.plusOnesCountAdults != null || guest.plusOnesCountChildren != null) && (
                        <span className="ml-0.5">
                          ({guest.plusOnesCountAdults ?? 0}A/{guest.plusOnesCountChildren ?? 0}C)
                        </span>
                      )}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {guest.email && (
                      <div className="text-muted-foreground">{guest.email}</div>
                    )}
                    {guest.phone && (
                      <div className="text-muted-foreground">{guest.phone}</div>
                    )}
                    {!guest.email && !guest.phone && (
                      <span className="text-muted-foreground italic">
                        No contact info
                      </span>
                    )}
                  </div>
                </TableCell>
                {guestSettings?.enableCategory && (
                  <TableCell>
                    <GuestCategoryBadge category={guest.category} options={guestSettings?.categoryOptions ?? null} />
                  </TableCell>
                )}
                <TableCell>
                  {onUpdateRsvpStatus ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="cursor-pointer">
                          <RsvpStatusBadge status={guest.rsvpStatus} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {RSVP_STATUSES.map((status) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={() => onUpdateRsvpStatus(guest, status)}
                            className={guest.rsvpStatus === status ? 'bg-accent' : ''}
                          >
                            {rsvpStatusLabels[status]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <RsvpStatusBadge status={guest.rsvpStatus} />
                  )}
                </TableCell>
                {guestSettings?.enableAccommodation && (
                  <TableCell className="text-sm text-muted-foreground max-w-[140px]">
                    {guest.needsAccommodation ? (
                      <span title={`${guest.hotelName ?? ''}${guest.roomNumber ? ` · Room ${guest.roomNumber}` : ''}`}>
                        Yes{guest.hotelName ? ` · ${guest.hotelName}` : ''}
                        {guest.roomNumber ? ` (${guest.roomNumber})` : ''}
                      </span>
                    ) : (
                      'No'
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCheckIn(guest)}
                    className={`min-w-[80px] ${guest.checkedIn ? 'border-transparent text-green-600 hover:bg-green-50 hover:text-green-700' : ''}`}
                  >
                    {guest.checkedIn ? (
                      <svg
                        className="h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      'Check In'
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(guest)}>
                        Edit
                      </DropdownMenuItem>
                      {onAudit && (
                        <DropdownMenuItem onClick={() => onAudit(guest)}>
                          Audit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleCopyRsvpLink(guest)}>
                        {copiedToken === guest.rsvpToken
                          ? 'Copied!'
                          : 'Copy RSVP Link'}
                      </DropdownMenuItem>
                      {guest.email && (
                        <DropdownMenuItem
                          onClick={() => onResendRsvp(guest)}
                          disabled={sendingRsvpUuid === guest.uuid}
                        >
                          {sendingRsvpUuid === guest.uuid ? 'Sending...' : 'Send RSVP Invitation'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(guest)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </Table>
    </div>
  );
}
