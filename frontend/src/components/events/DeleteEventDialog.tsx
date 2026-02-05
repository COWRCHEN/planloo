/**
 * Delete Event Dialog
 *
 * Confirmation dialog for deleting an event.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDeleteEvent } from '@/hooks/use-events';

interface DeleteEventDialogProps {
  uuid: string;
  eventTitle: string;
  onDeleted?: () => void;
  trigger?: React.ReactNode;
}

export function DeleteEventDialog({
  uuid,
  eventTitle,
  onDeleted,
  trigger,
}: DeleteEventDialogProps) {
  const [open, setOpen] = useState(false);
  const deleteEvent = useDeleteEvent();

  const handleDelete = () => {
    deleteEvent.mutate(uuid, {
      onSuccess: () => {
        setOpen(false);
        onDeleted?.();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="destructive" size="sm">
            Delete
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Event</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{eventTitle}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {deleteEvent.error && (
          <Alert variant="destructive">
            <AlertDescription>{deleteEvent.error.message}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleteEvent.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteEvent.isPending}>
            {deleteEvent.isPending ? 'Deleting...' : 'Delete Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
