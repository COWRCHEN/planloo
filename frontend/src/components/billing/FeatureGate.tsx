import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface FeatureGateProps {
  featureName: string;
  description: string;
  requiredPlan?: string;
  isLoading?: boolean;
}

export function FeatureGate({ featureName, description, requiredPlan, isLoading }: FeatureGateProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-12 text-center">
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-muted p-4">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-2">{featureName} is not available on your plan</h2>
      <p className="text-muted-foreground text-sm mb-1">{description}</p>
      {requiredPlan && (
        <p className="text-muted-foreground text-sm mb-6">
          Available on the <span className="font-medium">{requiredPlan}</span> plan and above.
        </p>
      )}
      {!requiredPlan && <div className="mb-6" />}
      <Button asChild>
        <a href="/dashboard/billing">Upgrade Plan</a>
      </Button>
    </div>
  );
}
