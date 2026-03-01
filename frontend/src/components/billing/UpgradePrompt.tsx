/**
 * UpgradePrompt — inline CTA shown when the API returns a 402 billing error.
 *
 * Usage:
 *   if (error?.code === 'GUEST_LIMIT_EXCEEDED') {
 *     return <UpgradePrompt error={error} />;
 *   }
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface BillingError {
  code: string;
  message: string;
  limit?: number;
  current?: number;
  upgradeTo?: string;
  upgradeUrl: string;
}

interface UpgradePromptProps {
  error: BillingError;
  className?: string;
}

const PLAN_LABELS: Record<string, string> = {
  personal: 'Personal',
  planner: 'Planner',
  agency: 'Agency',
};

export function UpgradePrompt({ error, className }: UpgradePromptProps) {
  const upgradeLabel = error.upgradeTo
    ? `Upgrade to ${PLAN_LABELS[error.upgradeTo] ?? error.upgradeTo}`
    : 'Upgrade plan';

  return (
    <Alert className={className} variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Plan limit reached</AlertTitle>
      <AlertDescription className="mt-1 flex flex-col gap-2">
        <span>{error.message}</span>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="/dashboard/billing">{upgradeLabel}</a>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
