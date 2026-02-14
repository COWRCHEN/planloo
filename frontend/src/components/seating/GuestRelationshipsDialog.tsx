import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  useGuestRelationships,
  useCreateRelationship,
  useDeleteRelationship,
} from '@/hooks/use-guest-relationships';

interface Props {
  eventUuid: string;
  allGuests: Array<{ uuid: string; firstName: string; lastName: string | null }>;
}

export function GuestRelationshipsDialog({ eventUuid, allGuests }: Props) {
  const { data: relationships = [], isLoading } = useGuestRelationships(eventUuid);
  const createMutation = useCreateRelationship(eventUuid);
  const deleteMutation = useDeleteRelationship(eventUuid);

  const [guest1Uuid, setGuest1Uuid] = useState('');
  const [guest2Uuid, setGuest2Uuid] = useState('');
  const [type, setType] = useState<'prefer_together' | 'avoid'>('prefer_together');
  const [notes, setNotes] = useState('');

  const handleCreate = () => {
    if (!guest1Uuid || !guest2Uuid || guest1Uuid === guest2Uuid) return;
    createMutation.mutate(
      { guestUuid1: guest1Uuid, guestUuid2: guest2Uuid, relationshipType: type, notes: notes || undefined },
      {
        onSuccess: () => {
          setGuest1Uuid('');
          setGuest2Uuid('');
          setNotes('');
        },
      }
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          Relationships
          {relationships.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {relationships.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Guest Relationships</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing relationships */}
          {relationships.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {relationships.map((rel) => (
                <div key={rel.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded border">
                  <span className="truncate">
                    {rel.guest1?.firstName} {rel.guest1?.lastName ?? ''}
                  </span>
                  <Badge
                    variant={rel.relationshipType === 'avoid' ? 'destructive' : 'default'}
                    className="text-[10px] flex-shrink-0"
                  >
                    {rel.relationshipType === 'avoid' ? 'Avoid' : 'Together'}
                  </Badge>
                  <span className="truncate">
                    {rel.guest2?.firstName} {rel.guest2?.lastName ?? ''}
                  </span>
                  {rel.notes && (
                    <span className="text-xs text-muted-foreground truncate ml-auto" title={rel.notes}>
                      ({rel.notes})
                    </span>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(rel.id)}
                    className="text-red-400 hover:text-red-600 ml-auto flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {relationships.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No relationships defined yet.
            </p>
          )}

          {/* Add new relationship */}
          <div className="border-t pt-3 space-y-2">
            <h4 className="text-sm font-medium">Add Relationship</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Guest 1</Label>
                <Select value={guest1Uuid} onValueChange={setGuest1Uuid}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select guest" />
                  </SelectTrigger>
                  <SelectContent>
                    {allGuests.map((g) => (
                      <SelectItem key={g.uuid} value={g.uuid} className="text-xs">
                        {g.firstName} {g.lastName ?? ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Guest 2</Label>
                <Select value={guest2Uuid} onValueChange={setGuest2Uuid}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select guest" />
                  </SelectTrigger>
                  <SelectContent>
                    {allGuests
                      .filter((g) => g.uuid !== guest1Uuid)
                      .map((g) => (
                        <SelectItem key={g.uuid} value={g.uuid} className="text-xs">
                          {g.firstName} {g.lastName ?? ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prefer_together" className="text-xs">Prefer Together</SelectItem>
                    <SelectItem value="avoid" className="text-xs">Avoid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!guest1Uuid || !guest2Uuid || guest1Uuid === guest2Uuid || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Relationship'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
