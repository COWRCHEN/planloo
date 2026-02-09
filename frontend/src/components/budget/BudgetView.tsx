import { useState } from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-auth';
import { BudgetSummary } from './BudgetSummary';
import { BudgetCategoryBreakdown } from './BudgetCategoryBreakdown';
import { BudgetItemList } from './BudgetItemList';
import { BudgetItemDetail } from './BudgetItemDetail';
import type { BudgetItemResponse } from '@/hooks/use-budget';

interface BudgetViewProps {
  eventUuid: string;
}

function BudgetViewContent({ eventUuid }: BudgetViewProps) {
  const { data: session, isLoading: sessionLoading } = useSession();
  const [selectedItem, setSelectedItem] = useState<BudgetItemResponse | null>(null);

  if (sessionLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to view the budget.</p>
          <Button asChild className="mt-4">
            <a href="/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show detail view when an item is selected
  if (selectedItem) {
    return (
      <BudgetItemDetail
        eventUuid={eventUuid}
        itemUuid={selectedItem.uuid}
        onBack={() => setSelectedItem(null)}
      />
    );
  }

  // Main budget dashboard view
  return (
    <div className="space-y-6">
      <BudgetSummary eventUuid={eventUuid} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BudgetItemList
            eventUuid={eventUuid}
            onSelectItem={setSelectedItem}
          />
        </div>
        <div>
          <BudgetCategoryBreakdown eventUuid={eventUuid} />
        </div>
      </div>
    </div>
  );
}

export function BudgetView({ eventUuid }: BudgetViewProps) {
  return (
    <QueryProvider>
      <BudgetViewContent eventUuid={eventUuid} />
    </QueryProvider>
  );
}
