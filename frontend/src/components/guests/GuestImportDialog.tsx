/**
 * Guest Import Dialog
 *
 * Modal for importing guests from CSV file.
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GuestImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (csvContent: string) => Promise<{ imported: number } | undefined>;
  isImporting: boolean;
}

export function GuestImportDialog({
  open,
  onOpenChange,
  onImport,
  isImporting,
}: GuestImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    setPreview([]);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      setFile(null);
      return;
    }

    setFile(selectedFile);

    // Read and preview first few lines
    const text = await selectedFile.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    setPreview(lines.slice(0, 6)); // Show header + first 5 rows
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      const csvContent = await file.text();
      const result = await onImport(csvContent);

      if (result) {
        // Success - close dialog
        setFile(null);
        setPreview([]);
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Guests from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with guest information. Required column:{' '}
            <code className="bg-muted px-1 rounded">firstName</code>. Optional:{' '}
            <code className="bg-muted px-1 rounded">lastName</code>,{' '}
            <code className="bg-muted px-1 rounded">email</code>,{' '}
            <code className="bg-muted px-1 rounded">phone</code>,{' '}
            <code className="bg-muted px-1 rounded">category</code>,{' '}
            <code className="bg-muted px-1 rounded">plusOnesAllowed</code>,{' '}
            <code className="bg-muted px-1 rounded">dietaryRestrictions</code>,{' '}
            <code className="bg-muted px-1 rounded">notes</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              Choose File
            </Button>
            <span className="text-sm text-muted-foreground">
              {file ? file.name : 'No file selected'}
            </span>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {preview.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <div className="bg-muted px-3 py-2 text-sm font-medium">
                Preview
              </div>
              <div className="overflow-x-auto">
                <pre className="p-3 text-xs whitespace-pre overflow-x-auto">
                  {preview.join('\n')}
                  {preview.length >= 6 && '\n...'}
                </pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || isImporting}>
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
