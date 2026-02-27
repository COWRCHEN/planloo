import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useVenues,
  useLinkVenue,
  type VenueResponse,
} from '@/hooks/use-providers';

const venueTypeLabels: Record<string, string> = {
  banquet_hall: 'Banquet Hall',
  outdoor: 'Outdoor',
  hotel: 'Hotel',
  restaurant: 'Restaurant',
  conference_center: 'Conference Center',
  other: 'Other',
};

interface LinkVenueDialogProps {
  eventUuid: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function LinkVenueDialog({ eventUuid, trigger, onSuccess }: LinkVenueDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<VenueResponse | null>(null);

  const venueFilters = search ? { search, limit: 10 } : { limit: 10 };
  const { data, isLoading } = useVenues(venueFilters);
  const linkMutation = useLinkVenue(eventUuid);

  const resetForm = () => {
    setSearch('');
    setSelectedVenue(null);
  };

  const handleLink = async () => {
    if (!selectedVenue) return;

    await linkMutation.mutateAsync({ venueUuid: selectedVenue.uuid });

    setOpen(false);
    resetForm();
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Link Venue</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Venue</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search Venues</Label>
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-20" />
                  </CardContent>
                </Card>
              ))
            ) : data?.items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No venues found.
              </p>
            ) : (
              data?.items.map((venue) => (
                <Card
                  key={venue.uuid}
                  className={`cursor-pointer transition-colors hover:bg-accent ${selectedVenue?.uuid === venue.uuid ? 'border-primary bg-accent' : ''}`}
                  onClick={() => setSelectedVenue(venue)}
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-medium">{venue.name}</p>
                      <p className="text-xs text-muted-foreground">{venue.city}, {venue.state}</p>
                    </div>
                    {venue.venueType && (
                      <Badge variant="outline">{venueTypeLabels[venue.venueType] ?? venue.venueType}</Badge>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {linkMutation.error && (
            <p className="text-sm text-destructive">{linkMutation.error.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={!selectedVenue || linkMutation.isPending}>
            {linkMutation.isPending ? 'Linking...' : 'Link Venue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
