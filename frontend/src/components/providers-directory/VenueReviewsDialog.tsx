import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useVenueReviews, type RatingBreakdown } from '@/hooks/use-providers';

// ==================== RATING BREAKDOWN BARS ====================

interface RatingBreakdownBarsProps {
  breakdown: RatingBreakdown;
  total: number;
}

export function RatingBreakdownBars({ breakdown, total }: RatingBreakdownBarsProps) {
  return (
    <div className="space-y-1">
      {([5, 4, 3, 2, 1] as const).map((star) => {
        const cnt = breakdown[star];
        const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 shrink-0 text-right text-muted-foreground">{star}</span>
            <svg className="h-3 w-3 shrink-0 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-yellow-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-muted-foreground">{cnt}</span>
          </div>
        );
      })}
    </div>
  );
}

// ==================== STAR DISPLAY (read-only) ====================

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? 'text-yellow-400' : 'text-muted-foreground/30'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

// ==================== VENUE REVIEWS DIALOG ====================

const PAGE_SIZE = 10;

interface VenueReviewsDialogProps {
  venueUuid: string;
  venueName: string;
  ratingAverage: number;
  ratingCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VenueReviewsDialog({
  venueUuid,
  venueName,
  ratingAverage,
  ratingCount,
  open,
  onOpenChange,
}: VenueReviewsDialogProps) {
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useVenueReviews(
    venueUuid,
    { limit: PAGE_SIZE, offset },
    open,
  );

  const total = data?.meta.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-base">Reviews for {venueName}</DialogTitle>
          {/* Summary row */}
          <div className="flex items-start gap-4 pt-3">
            <div className="text-center">
              <p className="text-4xl font-bold leading-none">{ratingAverage.toFixed(1)}</p>
              <div className="mt-1 flex justify-center">
                <StarDisplay rating={Math.round(ratingAverage)} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{ratingCount} {ratingCount === 1 ? 'review' : 'reviews'}</p>
            </div>
            {data?.breakdown && (
              <div className="flex-1">
                <RatingBreakdownBars breakdown={data.breakdown} total={ratingCount} />
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Review list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))
          ) : data?.reviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            data?.reviews.map((review) => (
              <div key={review.id} className="space-y-1 border-b pb-4 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{review.userName}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                </div>
                {review.rating !== null && (
                  <StarDisplay rating={review.rating} />
                )}
                {review.comment && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0 || isLoading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total || isLoading}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
