import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FloorPlanObjectResponse, SeatAssignmentResponse } from '@/hooks/use-floor-plans';
import type { UnassignedGuestResponse } from '@/hooks/use-floor-plan-objects';

interface Props {
  object: FloorPlanObjectResponse;
  unassignedGuests: UnassignedGuestResponse[];
  onAssign: (guestUuid: string, seatNumber: number) => void;
  onUnassign: (guestUuid: string) => void;
  onUpdate: (data: { label?: string; seatCount?: number }) => void;
  onDelete: () => void;
  isAssigning?: boolean;
}

const RSVP_BADGE: Record<string, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  invited: { label: 'Invited', className: 'bg-amber-100 text-amber-700' },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-700' },
  maybe: { label: 'Maybe', className: 'bg-purple-100 text-purple-700' },
};

function TableIcon({ shape }: { shape: string | null }) {
  const className = 'w-5 h-5 flex-shrink-0 text-muted-foreground';
  if (shape === 'round') {
    return (
      <svg className={className} viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (shape === 'rectangular' || shape === 'head_table') {
    return (
      <svg className={className} viewBox="0 0 16 16">
        <rect x="1" y="4" width="14" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 16 16">
      <rect x="3" y="3" width="10" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function TableCard({
  object,
  unassignedGuests,
  onAssign,
  onUnassign,
  onUpdate,
  onDelete,
  isAssigning,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(object.label);
  const [editSeats, setEditSeats] = useState(object.seatCount ?? 8);

  const seats = object.seatCount ?? 8;
  const assigned = object.assignments.length;
  const isOverCapacity = assigned > seats;

  // Build seat map for finding next available seat
  const seatMap = new Map<number, SeatAssignmentResponse>();
  for (const a of object.assignments) {
    seatMap.set(a.seatNumber, a);
  }

  const nextAvailableSeat = (() => {
    for (let i = 1; i <= seats; i++) {
      if (!seatMap.has(i)) return i;
    }
    return null;
  })();

  const filtered = search
    ? unassignedGuests.filter((g) => {
        const name = `${g.firstName} ${g.lastName ?? ''}`.toLowerCase();
        return name.includes(search.toLowerCase());
      })
    : unassignedGuests;

  const handleSaveEdit = () => {
    const changes: { label?: string; seatCount?: number } = {};
    if (editLabel.trim() && editLabel.trim() !== object.label) changes.label = editLabel.trim();
    if (editSeats !== (object.seatCount ?? 8)) changes.seatCount = editSeats;
    if (Object.keys(changes).length > 0) onUpdate(changes);
    setIsEditing(false);
  };

  return (
    <Card className={isOverCapacity ? 'border-red-300 bg-red-50/30' : ''}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center gap-2">
          <TableIcon shape={object.tableShape} />
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="h-6 text-sm w-24"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              />
              <Input
                type="number"
                value={editSeats}
                onChange={(e) => setEditSeats(Number(e.target.value) || 1)}
                min={1}
                max={50}
                className="h-6 text-sm w-14"
              />
              <Button variant="ghost" size="sm" onClick={handleSaveEdit} className="h-6 text-xs px-2">
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-6 text-xs px-2">
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <span className="text-sm font-medium flex-1 truncate">{object.label}</span>
              <Badge
                variant={isOverCapacity ? 'destructive' : assigned === seats ? 'default' : 'secondary'}
                className="text-xs"
              >
                {assigned}/{seats}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                title="Edit"
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M11.5 1.5l3 3-9 9H2.5v-3z" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                title="Delete table"
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 4h12M5.3 4V2.7a1 1 0 011-1h3.4a1 1 0 011 1V4M6.5 7v4.5M9.5 7v4.5M3.5 4l.7 9.3a1 1 0 001 .9h5.6a1 1 0 001-.9L12.5 4" />
                </svg>
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {/* Assigned guests */}
        {assigned > 0 && (
          <div className="space-y-0.5 mb-2">
            {(expanded ? object.assignments : object.assignments.slice(0, 3)).map((a) => (
              <div key={a.guestUuid} className="flex items-center gap-1.5 text-xs py-0.5">
                <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {a.seatNumber}
                </span>
                <span className="truncate flex-1">
                  {a.guestFirstName} {a.guestLastName ?? ''}
                </span>
                {a.guestRsvpStatus && (
                  <span className={`text-[10px] px-1 rounded ${RSVP_BADGE[a.guestRsvpStatus]?.className ?? ''}`}>
                    {RSVP_BADGE[a.guestRsvpStatus]?.label?.[0]}
                  </span>
                )}
                <button
                  onClick={() => onUnassign(a.guestUuid)}
                  className="text-red-400 hover:text-red-600 text-xs flex-shrink-0"
                  title="Unassign"
                >
                  &times;
                </button>
              </div>
            ))}
            {!expanded && assigned > 3 && (
              <button onClick={() => setExpanded(true)} className="text-xs text-primary hover:underline">
                +{assigned - 3} more
              </button>
            )}
            {expanded && assigned > 3 && (
              <button onClick={() => setExpanded(false)} className="text-xs text-primary hover:underline">
                Show less
              </button>
            )}
          </div>
        )}

        {/* Quick assign */}
        {nextAvailableSeat && (
          <div className="border-t pt-2">
            <Input
              placeholder="Search guests to assign..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs mb-1"
            />
            {(search || unassignedGuests.length <= 5) && (
              <div className="max-h-28 overflow-y-auto space-y-0.5">
                {filtered.slice(0, 8).map((guest) => (
                  <button
                    key={guest.uuid}
                    onClick={() => {
                      onAssign(guest.uuid, nextAvailableSeat);
                      setSearch('');
                    }}
                    disabled={isAssigning}
                    className="w-full text-left text-xs px-2 py-1 rounded hover:bg-primary-50 flex items-center gap-1"
                  >
                    <span className="truncate flex-1">
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
                  <p className="text-xs text-muted-foreground py-1 text-center">
                    {search ? 'No matching guests' : 'All guests assigned'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!nextAvailableSeat && assigned === seats && (
          <p className="text-xs text-muted-foreground text-center py-1">Table full</p>
        )}
      </CardContent>
    </Card>
  );
}
