/**
 * Guest Export Button
 *
 * Button to export guests to CSV.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { exportGuests } from '@/hooks/use-guests';
import { useBilling } from '@/hooks/use-billing';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';

interface GuestExportButtonProps {
  eventUuid: string;
  disabled?: boolean;
}

export function GuestExportButton({ eventUuid, disabled }: GuestExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showCsvLimitDialog, setShowCsvLimitDialog] = useState(false);
  const { data: billingData } = useBilling();

  const handleExport = async () => {
    if (billingData?.limits.csvImportExport === false) {
      setShowCsvLimitDialog(true);
      return;
    }
    setIsExporting(true);
    try {
      await exportGuests(eventUuid);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={disabled || isExporting}
    >
      <svg
        className="mr-2 h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      {isExporting ? 'Exporting...' : 'Export CSV'}
    </Button>
    <Dialog open={showCsvLimitDialog} onOpenChange={setShowCsvLimitDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan limit reached</DialogTitle>
        </DialogHeader>
        <UpgradePrompt
          error={{
            code: 'CSV_EXPORT_BLOCKED',
            message: 'CSV export requires a paid plan.',
            upgradeUrl: '/dashboard/billing',
          }}
        />
      </DialogContent>
    </Dialog>
    </>
  );
}
