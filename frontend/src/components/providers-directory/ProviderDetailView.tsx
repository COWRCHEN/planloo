import { useState } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ProviderCategoryBadge } from './ProviderCategoryBadge';
import { ProviderDialog } from './ProviderDialog';
import { ProviderStarRating } from './ProviderStarRating';
import { ProviderCommentForm } from './ProviderCommentForm';
import { ProviderReviewsDialog, ProviderRatingBreakdownBars } from './ProviderReviewsDialog';
import { useProvider, useDeleteProvider } from '@/hooks/use-providers';

interface ProviderDetailViewProps {
  uuid: string;
}

function ProviderDetailContent({ uuid }: ProviderDetailViewProps) {
  const { data: provider, isLoading, error } = useProvider(uuid);
  const deleteProvider = useDeleteProvider();
  const [hoverOpen, setHoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">{error?.message ?? 'Provider not found.'}</p>
          <Button variant="outline" className="mt-4" asChild>
            <a href="/dashboard/providers">Back to directory</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const locationParts = [provider.locationAddress, provider.locationCity, provider.locationState].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <a href="/dashboard/providers">
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to directory
        </a>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{provider.businessName}</h1>
            <ProviderCategoryBadge category={provider.category} />
          </div>
          {provider.ratingCount > 0 && (
            <>
              <Popover open={hoverOpen} onOpenChange={setHoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    onMouseEnter={() => setHoverOpen(true)}
                    onMouseLeave={() => setHoverOpen(false)}
                    onClick={() => { setHoverOpen(false); setDialogOpen(true); }}
                  >
                    <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {provider.ratingAverage.toFixed(1)} ({provider.ratingCount} {provider.ratingCount === 1 ? 'review' : 'reviews'})
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 p-3"
                  onMouseEnter={() => setHoverOpen(true)}
                  onMouseLeave={() => setHoverOpen(false)}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  side="bottom"
                  align="start"
                >
                  {provider.ratingBreakdown
                    ? <ProviderRatingBreakdownBars breakdown={provider.ratingBreakdown} total={provider.ratingCount} />
                    : <p className="text-xs text-muted-foreground">No breakdown available</p>}
                  <button
                    type="button"
                    className="mt-2 w-full text-xs text-primary hover:underline text-left"
                    onClick={() => { setHoverOpen(false); setDialogOpen(true); }}
                  >
                    See all reviews
                  </button>
                </PopoverContent>
              </Popover>
              <ProviderReviewsDialog
                providerUuid={provider.uuid}
                providerName={provider.businessName}
                ratingAverage={provider.ratingAverage}
                ratingCount={provider.ratingCount}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {provider.isOwner && (
            <>
              <ProviderDialog
                provider={provider}
                trigger={
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                }
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteProvider.isPending}
                onClick={() => {
                  if (confirm('Are you sure you want to delete this provider?')) {
                    deleteProvider.mutate(provider.uuid, {
                      onSuccess: () => {
                        window.location.href = '/dashboard/providers';
                      },
                    });
                  }
                }}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {provider.description && (
        <p className="text-muted-foreground">{provider.description}</p>
      )}

      {/* Info grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Location card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {provider.locationAddress && <p>{provider.locationAddress}</p>}
            <p>{[provider.locationCity, provider.locationState].filter(Boolean).join(', ')} {provider.locationPostalCode}</p>
            {provider.locationCountry && <p>{provider.locationCountry}</p>}
            {!locationParts.length && (
              <p className="text-muted-foreground">No location info available.</p>
            )}
          </CardContent>
        </Card>

        {/* Pricing & Services card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pricing & Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {provider.priceRange && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price range</span>
                <span>{provider.priceRange}</span>
              </div>
            )}
            {provider.servicesOffered && provider.servicesOffered.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-muted-foreground">Services</span>
                <div className="flex flex-wrap gap-1">
                  {provider.servicesOffered.map((service) => (
                    <Badge key={service} variant="secondary" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {!provider.priceRange && (!provider.servicesOffered || provider.servicesOffered.length === 0) && (
              <p className="text-muted-foreground">No pricing or services info available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Contact section */}
      {(provider.email || provider.phone || provider.website || provider.contactName) && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Contact</h3>
          {provider.contactName && (
            <p className="text-sm text-muted-foreground">{provider.contactName}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {provider.email && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${provider.email}`}>
                  <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {provider.email}
                </a>
              </Button>
            )}
            {provider.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${provider.phone}`}>
                  <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {provider.phone}
                </a>
              </Button>
            )}
            {provider.website && (
              <Button variant="outline" size="sm" asChild>
                <a href={provider.website} target="_blank" rel="noopener noreferrer">
                  <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Website
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* User's personal rating & comment */}
      <Accordion type="single" collapsible>
        <AccordionItem value="user-review" className="rounded-lg border px-4">
          <AccordionTrigger className="text-sm font-medium hover:no-underline">
            <div className="flex items-center gap-3">
              <span>Your Rating & Notes</span>
              {provider.userRating ? (
                <span className="flex items-center gap-1 text-yellow-500 text-xs font-normal">
                  {'★'.repeat(provider.userRating)}{'☆'.repeat(5 - provider.userRating)}
                  <span className="text-muted-foreground">{provider.userRating}/5</span>
                </span>
              ) : provider.userComment ? (
                <span className="text-xs text-muted-foreground font-normal truncate max-w-[200px]">
                  "{provider.userComment}"
                </span>
              ) : (
                <span className="text-xs text-muted-foreground font-normal">No rating yet</span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <div className="flex items-center gap-2">
              <ProviderStarRating providerUuid={provider.uuid} userRating={provider.userRating} size="md" />
              {provider.userRating && (
                <span className="text-sm text-muted-foreground">{provider.userRating} / 5</span>
              )}
            </div>
            <ProviderCommentForm providerUuid={provider.uuid} userComment={provider.userComment} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function ProviderDetailView({ uuid }: ProviderDetailViewProps) {
  return (
    <QueryProvider>
      <ProviderDetailContent uuid={uuid} />
    </QueryProvider>
  );
}
