/**
 * Guest Audit Dialog
 *
 * Shows history of who created/updated a guest and when, with field-level changes.
 * Optional fields (meal, accommodation, table, etc.) are shown only when enabled for the event.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useGuestAudit,
  type GuestResponse,
  type GuestSettingsResponse,
  type GuestAuditEntryResponse,
} from '@/hooks/use-guests';

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  category: 'Category',
  rsvpStatus: 'RSVP status',
  plusOnesAllowed: 'Plus ones allowed',
  plusOnesCount: 'Plus ones count',
  plusOnesCountAdults: 'Plus ones (adults)',
  plusOnesCountChildren: 'Plus ones (children)',
  dietaryRestrictions: 'Dietary restrictions',
  notes: 'Notes',
  mealChoice: 'Meal choice',
  tableAssignment: 'Table assignment',
  needsAccommodation: 'Needs accommodation',
  hotelName: 'Hotel name',
  checkInDate: 'Check-in date',
  checkOutDate: 'Check-out date',
  roomNumber: 'Room number',
  addressStreet: 'Address (street)',
  addressCity: 'City',
  addressState: 'State',
  addressZipCode: 'ZIP code',
  addressCountry: 'Country',
  plusOneName: 'Plus one name',
  transportationNeeded: 'Transportation needed',
  accessibilityNeeds: 'Accessibility needs',
  customFieldData: 'Custom fields',
};

function isOptionalFieldEnabled(
  field: string,
  settings: GuestSettingsResponse | undefined
): boolean {
  if (!settings) return false;
  switch (field) {
    case 'mealChoice':
      return settings.enableMealChoice;
    case 'tableAssignment':
      return settings.enableTableAssignment;
    case 'needsAccommodation':
    case 'hotelName':
    case 'checkInDate':
    case 'checkOutDate':
    case 'roomNumber':
      return settings.enableAccommodation;
    case 'addressStreet':
    case 'addressCity':
    case 'addressState':
    case 'addressZipCode':
    case 'addressCountry':
      return settings.enableAddress;
    case 'plusOneName':
      return settings.enablePlusOneName;
    case 'transportationNeeded':
      return settings.enableTransportation;
    case 'accessibilityNeeds':
      return settings.enableAccessibility;
    case 'category':
      return settings.enableCategory;
    case 'customFieldData':
      return !!(settings.customFieldDefinitions && settings.customFieldDefinitions.length > 0);
    default:
      return true; // core fields always show
  }
}

function formatChangeValue(
  val: unknown,
  field?: string,
  settings?: GuestSettingsResponse
): string {
  if (val === null || val === undefined) return '—';
  if (field === 'category' && typeof val === 'string' && settings?.categoryOptions?.length) {
    const label = settings.categoryOptions.find((o) => o.key === val)?.label;
    return label ?? val;
  }
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))) {
    try {
      const d = typeof val === 'string' ? new Date(val) : val;
      return d.toLocaleDateString(undefined, { dateStyle: 'short' });
    } catch {
      return String(val);
    }
  }
  return String(val);
}

function formatDateTime(isoOrTimestamp: string | number): string {
  try {
    const date = typeof isoOrTimestamp === 'number' ? new Date(isoOrTimestamp * 1000) : new Date(isoOrTimestamp);
    return date.toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return String(isoOrTimestamp);
  }
}

interface GuestAuditDialogProps {
  eventUuid: string;
  guest: GuestResponse | null;
  guestSettings: GuestSettingsResponse | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuestAuditDialog({
  eventUuid,
  guest,
  guestSettings,
  open,
  onOpenChange,
}: GuestAuditDialogProps) {
  const { data: entries, isLoading, error } = useGuestAudit(
    eventUuid,
    open && guest ? guest.uuid : undefined
  );

  const guestName = guest
    ? guest.lastName
      ? `${guest.firstName} ${guest.lastName}`
      : guest.firstName
    : '';

  const filterChanges = (entry: GuestAuditEntryResponse) => {
    const changes = entry.details?.changes ?? [];
    return changes.filter((c) => isOptionalFieldEnabled(c.field, guestSettings));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Audit history — {guestName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {error && (
            <p className="text-destructive text-sm">
              Failed to load audit history.
              {error instanceof Error && error.message ? (
                <span className="block mt-1 font-normal opacity-90">
                  {error.message}
                </span>
              ) : null}
            </p>
          )}

          {!isLoading && !error && (!entries || entries.length === 0) && (
            <p className="text-muted-foreground text-sm">
              No audit history yet. Changes will appear here after the guest is created or updated.
            </p>
          )}

          {!isLoading && !error && entries && entries.length > 0 && (
            <ul className="space-y-4">
              {entries.map((entry) => {
                const filteredChanges = filterChanges(entry);
                const actorLabel = entry.actor
                  ? entry.actor.name || entry.actor.email || 'Unknown user'
                  : entry.details?.source === 'rsvp'
                    ? 'RSVP response'
                    : 'Unknown';
                return (
                  <li key={entry.id} className="border-l-2 border-muted pl-4 pb-2">
                    <div className="text-sm font-medium">
                      {entry.action === 'create' ? 'Created' : 'Updated'}
                      {' · '}
                      <span className="text-muted-foreground font-normal">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      by {actorLabel}
                    </div>
                    {entry.action === 'update' && filteredChanges.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {filteredChanges.map((c, i) => (
                          <li key={`${c.field}-${i}`}>
                            <span className="text-muted-foreground">
                              {FIELD_LABELS[c.field] ?? c.field}:
                            </span>{' '}
                            {formatChangeValue(c.from, c.field, guestSettings)} → {formatChangeValue(c.to, c.field, guestSettings)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
