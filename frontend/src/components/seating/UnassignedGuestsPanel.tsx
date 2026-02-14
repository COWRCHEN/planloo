import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { UnassignedGuestResponse } from '@/hooks/use-floor-plan-objects';

interface Props {
  guests: UnassignedGuestResponse[];
  onAutoAssign: (guestUuids: string[]) => void;
  isAutoAssigning?: boolean;
}

export function UnassignedGuestsPanel({ guests, onAutoAssign, isAutoAssigning }: Props) {
  const [search, setSearch] = useState('');
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  const filtered = search
    ? guests.filter((g) => {
        const name = `${g.firstName} ${g.lastName ?? ''}`.toLowerCase();
        return name.includes(search.toLowerCase());
      })
    : guests;

  const toggleSelect = (uuid: string) => {
    const next = new Set(selectedUuids);
    if (next.has(uuid)) next.delete(uuid);
    else next.add(uuid);
    setSelectedUuids(next);
  };

  const selectAll = () => {
    if (selectedUuids.size === filtered.length) {
      setSelectedUuids(new Set());
    } else {
      setSelectedUuids(new Set(filtered.map((g) => g.uuid)));
    }
  };

  if (guests.length === 0) return null;

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-gray-50"
      >
        <span>Unassigned Guests</span>
        <Badge variant="secondary">{guests.length}</Badge>
      </button>

      {isOpen && (
        <div className="border-t px-3 py-2 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="text-xs h-7 px-2 whitespace-nowrap"
            >
              {selectedUuids.size === filtered.length ? 'Deselect' : 'Select All'}
            </Button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {filtered.map((guest) => (
              <label
                key={guest.uuid}
                className="flex items-center gap-2 text-xs px-1 py-0.5 rounded hover:bg-gray-50 cursor-pointer"
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

          {selectedUuids.size > 0 && (
            <Button
              size="sm"
              onClick={() => {
                onAutoAssign([...selectedUuids]);
                setSelectedUuids(new Set());
              }}
              disabled={isAutoAssigning}
              className="w-full text-xs h-7"
            >
              {isAutoAssigning
                ? 'Assigning...'
                : `Auto-Assign ${selectedUuids.size} Guest${selectedUuids.size === 1 ? '' : 's'}`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
