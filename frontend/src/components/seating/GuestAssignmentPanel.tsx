import { useState } from 'react';
import { Input } from '@/components/ui/input';
import type { FloorPlanObjectResponse, SeatAssignmentResponse } from '@/hooks/use-floor-plans';
import type { UnassignedGuestResponse } from '@/hooks/use-floor-plan-objects';

interface Props {
  object: FloorPlanObjectResponse;
  unassignedGuests: UnassignedGuestResponse[];
  onAssign: (guestUuid: string, seatNumber: number) => void;
  onUnassign: (guestUuid: string) => void;
  onClose?: () => void;
  isAssigning?: boolean;
}

const RSVP_BADGE: Record<string, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  invited: { label: 'Invited', className: 'bg-amber-100 text-amber-700' },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-700' },
  maybe: { label: 'Maybe', className: 'bg-purple-100 text-purple-700' },
};

export function GuestAssignmentPanel({ object, unassignedGuests, onAssign, onUnassign, onClose, isAssigning }: Props) {
  const [search, setSearch] = useState('');
  const seats = object.seatCount ?? 8;

  // Build seat map
  const seatMap = new Map<number, SeatAssignmentResponse>();
  for (const a of object.assignments) {
    seatMap.set(a.seatNumber, a);
  }

  // Find next available seat
  const nextAvailableSeat = (() => {
    for (let i = 1; i <= seats; i++) {
      if (!seatMap.has(i)) return i;
    }
    return null;
  })();

  // Filter unassigned guests
  const filtered = search
    ? unassignedGuests.filter((g) => {
        const name = `${g.firstName} ${g.lastName ?? ''}`.toLowerCase();
        return name.includes(search.toLowerCase());
      })
    : unassignedGuests;

  return (
    <div className="w-64 h-full border-l bg-white p-3 overflow-y-auto space-y-3 shadow-lg">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{object.label} — Seats</h3>
          {onClose && (
            <button onClick={onClose} className="text-xs text-primary hover:underline">
              Hide
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {object.assignments.length}/{seats} seats filled
        </p>
      </div>

      {/* Current assignments */}
      <div className="space-y-1">
        {Array.from({ length: seats }, (_, i) => i + 1).map((seatNum) => {
          const assignment = seatMap.get(seatNum);
          return (
            <div
              key={seatNum}
              className="flex items-center gap-2 text-xs py-1 px-2 rounded border bg-gray-50"
            >
              <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {seatNum}
              </span>
              {assignment ? (
                <>
                  <span className="flex-1 truncate">
                    {assignment.guestFirstName} {assignment.guestLastName ?? ''}
                  </span>
                  {assignment.guestRsvpStatus && (
                    <span className={`text-[10px] px-1 rounded ${RSVP_BADGE[assignment.guestRsvpStatus]?.className ?? ''}`}>
                      {RSVP_BADGE[assignment.guestRsvpStatus]?.label?.[0]}
                    </span>
                  )}
                  <button
                    onClick={() => onUnassign(assignment.guestUuid)}
                    className="text-red-400 hover:text-red-600 text-xs"
                    title="Remove"
                  >
                    ×
                  </button>
                </>
              ) : (
                <span className="text-muted-foreground italic">Empty</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick assign from unassigned guests */}
      {nextAvailableSeat && (
        <div className="border-t pt-2">
          <h4 className="text-xs font-medium mb-1">Quick Assign to Seat {nextAvailableSeat}</h4>
          <Input
            placeholder="Search guests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs mb-1"
          />
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {filtered.slice(0, 10).map((guest) => (
              <button
                key={guest.uuid}
                onClick={() => {
                  onAssign(guest.uuid, nextAvailableSeat);
                  setSearch('');
                }}
                disabled={isAssigning}
                className="w-full text-left text-xs px-2 py-1 rounded hover:bg-primary-50 flex items-center gap-1"
              >
                <span className="truncate">
                  {guest.firstName} {guest.lastName ?? ''}
                </span>
                {guest.rsvpStatus && (
                  <span className={`text-[10px] px-1 rounded ml-auto flex-shrink-0 ${RSVP_BADGE[guest.rsvpStatus]?.className ?? ''}`}>
                    {RSVP_BADGE[guest.rsvpStatus]?.label?.[0]}
                  </span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">
                {search ? 'No matching guests' : 'All guests assigned'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
