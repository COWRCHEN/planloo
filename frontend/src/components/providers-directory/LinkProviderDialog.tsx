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
import { Skeleton } from '@/components/ui/skeleton';
import { ProviderCategoryBadge } from './ProviderCategoryBadge';
import {
  useProviders,
  useLinkProvider,
  type ServiceProviderResponse,
} from '@/hooks/use-providers';

interface LinkProviderDialogProps {
  eventUuid: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function LinkProviderDialog({ eventUuid, trigger, onSuccess }: LinkProviderDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ServiceProviderResponse | null>(null);

  const providerFilters = search ? { search, limit: 10 } : { limit: 10 };
  const { data, isLoading } = useProviders(providerFilters);
  const linkMutation = useLinkProvider(eventUuid);

  const resetForm = () => {
    setSearch('');
    setSelectedProvider(null);
  };

  const handleLink = async () => {
    if (!selectedProvider) return;

    await linkMutation.mutateAsync({ providerUuid: selectedProvider.uuid });

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
                  className={`cursor-pointer transition-colors hover:bg-accent ${selectedProvider?.uuid === provider.uuid ? 'border-primary bg-accent' : ''}`}
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

          {linkMutation.error && (
            <p className="text-sm text-destructive">{linkMutation.error.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={!selectedProvider || linkMutation.isPending}>
            {linkMutation.isPending ? 'Linking...' : 'Link Provider'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
