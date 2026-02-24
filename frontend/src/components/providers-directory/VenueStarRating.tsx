import { useState } from 'react';
import { useRateVenue } from '@/hooks/use-providers';

interface VenueStarRatingProps {
  venueUuid: string;
  userRating: number | null;
  size?: 'sm' | 'md';
}

export function VenueStarRating({ venueUuid, userRating, size = 'sm' }: VenueStarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  // localRating drives the display; initialized from prop, then owned by the component.
  // No useEffect sync — background refetches would reset it before the mouse leaves.
  const [localRating, setLocalRating] = useState<number | null>(userRating);
  const rateVenue = useRateVenue();

  const iconSize = size === 'md' ? 'h-6 w-6' : 'h-4 w-4';
  const active = hovered ?? localRating ?? 0;

  function handleClick(star: number) {
    const prevRating = localRating; // snapshot before mutation
    const newRating = star === localRating ? null : star;
    setLocalRating(newRating); // immediate — survives mouse-leave before refetch
    rateVenue.mutate({ venueUuid, rating: newRating }, {
      onError: () => setLocalRating(prevRating), // revert to pre-click value, not stale prop
    });
  }

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHovered(null)}
      aria-label={localRating ? `Your rating: ${localRating} out of 5` : 'Rate this venue'}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={rateVenue.isPending}
          className="shrink-0 transition-transform hover:scale-110 disabled:opacity-50"
          onMouseEnter={() => setHovered(star)}
          onClick={() => handleClick(star)}
          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
        >
          <svg
            className={`${iconSize} ${star <= active ? 'text-yellow-400' : 'text-muted-foreground/40'}`}
            fill={star <= active ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
