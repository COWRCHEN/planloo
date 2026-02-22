import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProviderCategoryBadge } from './ProviderCategoryBadge';
import { ProviderDialog } from './ProviderDialog';
import type { ServiceProviderResponse } from '@/hooks/use-providers';

interface ProviderCardProps {
  provider: ServiceProviderResponse;
  onSelect?: (provider: ServiceProviderResponse) => void;
}

export function ProviderCard({ provider, onSelect }: ProviderCardProps) {
  const locationParts = [provider.locationCity, provider.locationState].filter(Boolean);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{provider.businessName}</CardTitle>
          <ProviderCategoryBadge category={provider.category} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        {provider.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{provider.description}</p>
        )}
        <div className="mt-auto space-y-1.5 text-sm">
          {provider.priceRange && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {provider.priceRange}
            </div>
          )}
          {locationParts.length > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {locationParts.join(', ')}
            </div>
          )}
          {provider.ratingCount > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {provider.ratingAverage.toFixed(1)} ({provider.ratingCount})
            </div>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          {provider.isOwner && (
            <ProviderDialog
              provider={provider}
              trigger={
                <Button variant="outline" size="sm" className="flex-1">
                  Edit
                </Button>
              }
            />
          )}
          {onSelect && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onSelect(provider)}>
              View
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
