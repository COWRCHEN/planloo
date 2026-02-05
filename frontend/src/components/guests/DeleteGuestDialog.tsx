/**
 * Delete Guest Dialog
 *
 * Confirmation dialog for deleting a guest.
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { GuestResponse } from '@/hooks/use-guests';

interface DeleteGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: GuestResponse | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteGuestDialog({
  open,
  onOpenChange,
  guest,
  onConfirm,
  isDeleting,
}: DeleteGuestDialogProps) {
  if (!guest) return null;

  const guestName = guest.lastName
    ? `${guest.firstName} ${guest.lastName}`
    : guest.firstName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Guest</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <strong>{guestName}</strong> from
            the guest list? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
