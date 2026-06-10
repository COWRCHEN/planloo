import { QueryProvider } from '@/components/providers/QueryProvider';
import { Button } from '@/components/ui/button';
import { PricingTable } from './PricingTable';

function CustomizePlanContent() {
  return (
    <div className="space-y-6">
      <div>
        <Button variant="outline" asChild>
          <a href="/dashboard/billing">Back to billing</a>
        </Button>
      </div>

      <div>
        <h2 className="mb-1 text-xl font-semibold">Upgrade your plan</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Pay only for what you need. Add or remove units at any time.
        </p>
        <PricingTable />
      </div>
    </div>
  );
}

export function CustomizePlanView() {
  return (
    <QueryProvider>
      <CustomizePlanContent />
    </QueryProvider>
  );
}
