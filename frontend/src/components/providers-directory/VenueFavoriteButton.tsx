import { Button } from '@/components/ui/button';
import { useToggleFavorite } from '@/hooks/use-providers';

interface VenueFavoriteButtonProps {
  venueUuid: string;
  isFavorited: boolean | undefined;
}

export function VenueFavoriteButton({ venueUuid, isFavorited }: VenueFavoriteButtonProps) {
  const toggleFavorite = useToggleFavorite();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      disabled={toggleFavorite.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite.mutate(venueUuid);
      }}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        className="h-4 w-4"
        fill={isFavorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </Button>
  );
}
