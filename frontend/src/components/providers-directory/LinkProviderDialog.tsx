import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProviderCategoryBadge } from './ProviderCategoryBadge';
import {
  useProviders,
  useLinkProvider,
  BOOKING_STATUSES,
  type ServiceProviderResponse,
  type BookingStatus,
} from '@/hooks/use-providers';

const statusLabels: Record<BookingStatus, string> = {
  inquiry: 'Inquiry',
  quoted: 'Quoted',
  booked: 'Booked',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

interface LinkProviderDialogProps {
  eventUuid: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function LinkProviderDialog({ eventUuid, trigger, onSuccess }: LinkProviderDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ServiceProviderResponse | null>(null);
  const [status, setStatus] = useState<BookingStatus>('inquiry');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [notes, setNotes] = useState('');

  const providerFilters = search ? { search, limit: 10 } : { limit: 10 };
  const { data, isLoading } = useProviders(providerFilters);
  const linkMutation = useLinkProvider(eventUuid);

  const resetForm = () => {
    setSearch('');
    setSelectedProvider(null);
    setStatus('inquiry');
    setQuoteAmount('');
    setNotes('');
  };

  const handleLink = async () => {
    if (!selectedProvider) return;

    await linkMutation.mutateAsync({
      providerUuid: selectedProvider.uuid,
      status,
      quoteAmount: quoteAmount ? parseFloat(quoteAmount) : null,
      notes: notes || null,
    });

    setOpen(false);
    resetForm();
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Link Provider</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Service Provider</DialogTitle>
        </DialogHeader>

        {!selectedProvider ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search Providers</Label>
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
                  No providers found.
                </p>
              ) : (
                data?.items.map((provider) => (
                  <Card
                    key={provider.uuid}
                    className="cursor-pointer transition-colors hover:bg-accent"
                    onClick={() => setSelectedProvider(provider)}
                  >
                    <CardContent className="flex items-center justify-between p-3">
                      <div>
                        <p className="text-sm font-medium">{provider.businessName}</p>
                        {provider.locationCity && (
                          <p className="text-xs text-muted-foreground">{provider.locationCity}, {provider.locationState}</p>
                        )}
                      </div>
                      <ProviderCategoryBadge category={provider.category} />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{selectedProvider.businessName}</p>
                  <p className="text-sm text-muted-foreground">{selectedProvider.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedProvider(null)}>
                  Change
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Booking Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as BookingStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quoteAmount">Quote Amount</Label>
              <Input
                id="quoteAmount"
                type="number"
                step="0.01"
                min="0"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleLink} disabled={linkMutation.isPending}>
                {linkMutation.isPending ? 'Linking...' : 'Link Provider'}
              </Button>
            </div>

            {linkMutation.error && (
              <p className="text-sm text-destructive">{linkMutation.error.message}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
