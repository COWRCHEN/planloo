import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { UnassignedGuestResponse } from '@/hooks/use-floor-plan-objects';

interface Props {
  unassignedGuests: UnassignedGuestResponse[];
  onAutoAssign: (guestUuids: string[]) => void;
  isAutoAssigning?: boolean;
}

export function AutoAssignDialog({ unassignedGuests, onAutoAssign, isAutoAssigning }: Props) {
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const toggleSelect = (uuid: string) => {
    const next = new Set(selectedUuids);
    if (next.has(uuid)) next.delete(uuid);
    else next.add(uuid);
    setSelectedUuids(next);
  };

  const selectAll = () => {
    if (selectedUuids.size === unassignedGuests.length) {
      setSelectedUuids(new Set());
    } else {
      setSelectedUuids(new Set(unassignedGuests.map((g) => g.uuid)));
    }
  };

  const handleAssign = () => {
    onAutoAssign([...selectedUuids]);
    setSelectedUuids(new Set());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs" disabled={unassignedGuests.length === 0}>
          Auto-Assign
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Auto-Assign Guests</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Selected guests will be randomly assigned to available seats across all tables.
        </p>

        <div className="flex items-center justify-between">
          <span className="text-sm">{selectedUuids.size} selected</span>
          <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
            {selectedUuids.size === unassignedGuests.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        <div className="max-h-60 overflow-y-auto border rounded-md p-1 space-y-0.5">
          {unassignedGuests.map((guest) => (
            <label
              key={guest.uuid}
              className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedUuids.has(guest.uuid)}
                onChange={() => toggleSelect(guest.uuid)}
                className="rounded"
              />
              <span className="truncate">
                {guest.firstName} {guest.lastName ?? ''}
              </span>
            </label>
          ))}
        </div>

        <Button
          onClick={handleAssign}
          disabled={selectedUuids.size === 0 || isAutoAssigning}
          className="w-full"
        >
          {isAutoAssigning
            ? 'Assigning...'
            : `Auto-Assign ${selectedUuids.size} Guest${selectedUuids.size === 1 ? '' : 's'}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
