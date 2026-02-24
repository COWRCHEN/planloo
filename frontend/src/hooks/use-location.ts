import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787/api/v1';

export interface DetectedLocation {
  detected: true;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: 'US' | 'CA';
}
export interface LocationNotDetected {
  detected: false;
}
export type LocationResult = DetectedLocation | LocationNotDetected;

export const locationKeys = {
  all: ['location'] as const,
  detected: () => [...locationKeys.all, 'detect'] as const,
};

export function useUserLocation() {
  return useQuery<LocationResult>({
    queryKey: locationKeys.detected(),
    queryFn: async () => {
      const res = await fetch(`${API_URL}/location/detect`, { credentials: 'include' });
      if (!res.ok) return { detected: false };
      const json = await res.json();
      return json.data ?? { detected: false };
    },
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
}
