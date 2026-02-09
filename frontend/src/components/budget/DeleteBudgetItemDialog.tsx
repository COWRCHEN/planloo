import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDeleteBudgetItem } from '@/hooks/use-budget';

interface DeleteBudgetItemDialogProps {
  eventUuid: string;
  itemUuid: string;
  itemName: string;
  onDeleted?: () => void;
  trigger?: React.ReactNode;
}

export function DeleteBudgetItemDialog({
  eventUuid,
  itemUuid,
  itemName,
  onDeleted,
  trigger,
}: DeleteBudgetItemDialogProps) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteBudgetItem(eventUuid);

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(itemUuid);
    setOpen(false);
    onDeleted?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="destructive" size="sm">Delete</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Budget Item</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{itemName}"? This action cannot be undone.
            All associated payments will also be removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
