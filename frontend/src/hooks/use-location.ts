import { useQuery } from '@tanstack/react-query';
import { AUTH_API_BASE_URL } from '@/lib/auth-client';

const API_URL = AUTH_API_BASE_URL;

export interface DetectedLocation {
  detected: true;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
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
