import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface NearYouBannerProps {
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  onApply: (params: { city?: string; state?: string; postalCode?: string; country: string }) => void;
}

export function NearYouBanner({ city, state, postalCode, country, onApply }: NearYouBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || (!city && !postalCode)) return null;

  const label = city ?? postalCode!;

  return (
    <Alert className="flex items-center justify-between gap-4 py-3">
      <AlertDescription className="flex-1 text-sm">
        We detected you are near <strong>{label}</strong>. Show providers near you?
      </AlertDescription>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            onApply({ city: city ?? undefined, state: state ?? undefined, postalCode: postalCode ?? undefined, country });
            setDismissed(true);
          }}
        >
          Show nearby
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
          Dismiss
        </Button>
      </div>
    </Alert>
  );
}
