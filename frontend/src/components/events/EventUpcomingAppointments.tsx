/**
 * Event Upcoming Appointments Component
 *
 * Displays upcoming scheduled appointments with providers/venues for an event,
 * sorted by appointment start time. Supports editing and cancelling individual
 * appointments inline.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  useEventAppointments,
  useUpdateLog,
  useCancelAppointment,
  useCreateLogEntry,
  type AppointmentResponse,
} from '@/hooks/use-providers';
import { generateICSContent, downloadICS } from '@/lib/ics';

// ==================== HELPERS ====================

function formatAppointmentTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const apptDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (apptDay.getTime() === today.getTime()) return `Today at ${timeStr}`;
  if (apptDay.getTime() === tomorrow.getTime()) return `Tomorrow at ${timeStr}`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` at ${timeStr}`;
}

function formatCategory(category: string): string {
  return category.replace(/_/g, ' ');
}

/** Convert an ISO string to the value expected by datetime-local inputs */
function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ==================== SKELETONS ====================

function AppointmentItemSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
  );
}

// ==================== EDIT DIALOG ====================

function formatShortDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const editFormSchema = z.object({
  appointmentStart: z.string().min(1, 'Start time is required'),
  appointmentEnd: z.string().optional(),
  contactPerson: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

type EditFormValues = z.infer<typeof editFormSchema>;

interface EditAppointmentDialogProps {
  appointment: AppointmentResponse;
  eventUuid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditAppointmentDialog({
  appointment,
  eventUuid,
  open,
  onOpenChange,
}: EditAppointmentDialogProps) {
  const updateLog = useUpdateLog(eventUuid);
  const createLogEntry = useCreateLogEntry(eventUuid);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      appointmentStart: isoToDatetimeLocal(appointment.appointmentStart),
      appointmentEnd: isoToDatetimeLocal(appointment.appointmentEnd),
      contactPerson: appointment.contactPerson ?? '',
      notes: appointment.notes ?? '',
    },
  });

  function onSubmit(values: EditFormValues) {
    const newStart = values.appointmentStart ? new Date(values.appointmentStart) : undefined;
    updateLog.mutate(
      {
        logId: appointment.id,
        data: {
          bookingStartTime: newStart,
          bookingEndTime: values.appointmentEnd ? new Date(values.appointmentEnd) : null,
          contactPerson: values.contactPerson || null,
          notes: values.notes || null,
        },
      },
      {
        onSuccess: () => {
          const timeLabel = newStart ? formatShortDateTime(newStart.toISOString()) : 'updated time';
          createLogEntry.mutate({
            entityType: appointment.entityType,
            linkId: appointment.linkId,
            notes: `Appointment rescheduled to ${timeLabel}`,
          });
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">{appointment.entityName}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Appointment Start <span className="text-destructive">*</span>
            </label>
            <Input type="datetime-local" {...register('appointmentStart')} />
            {errors.appointmentStart && (
              <p className="text-xs text-destructive">{errors.appointmentStart.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Appointment End</label>
            <Input type="datetime-local" {...register('appointmentEnd')} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Contact Person</label>
            <Input placeholder="Name or role..." {...register('contactPerson')} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea placeholder="Additional notes..." rows={3} {...register('notes')} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateLog.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateLog.isPending}>
              {updateLog.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== APPOINTMENT ITEM ====================

function handleExportSingle(appointment: AppointmentResponse) {
  const content = generateICSContent([appointment]);
  const safeName = appointment.entityName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  downloadICS(content, `appointment-${safeName}.ics`);
}

interface AppointmentItemProps {
  appointment: AppointmentResponse;
  eventUuid: string;
  onEdit: (appointment: AppointmentResponse) => void;
  onCancel: (appointment: AppointmentResponse) => void;
}

function AppointmentItem({ appointment, eventUuid, onEdit, onCancel }: AppointmentItemProps) {
  return (
    <div className="group flex items-center gap-2 py-3 -mx-2 px-2 rounded-md transition-colors hover:bg-muted/50">
      <a
        href={`/dashboard/events/${eventUuid}/providers`}
        className="flex items-center gap-3 min-w-0 flex-1"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{appointment.entityName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatAppointmentTime(appointment.appointmentStart)}
            {appointment.contactPerson && ` · ${appointment.contactPerson}`}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs capitalize">
          {formatCategory(appointment.entityCategory)}
        </Badge>
      </a>

      {/* Action buttons — visible on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => handleExportSingle(appointment)}
          title="Export to calendar (.ics)"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(appointment)}
          title="Edit appointment"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onCancel(appointment)}
          title="Cancel appointment"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </Button>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

interface EventUpcomingAppointmentsProps {
  eventUuid: string;
}

export function EventUpcomingAppointments({ eventUuid }: EventUpcomingAppointmentsProps) {
  const { data: appointments, isLoading, error } = useEventAppointments(eventUuid);
  const cancelAppointment = useCancelAppointment(eventUuid);
  const createLogEntry = useCreateLogEntry(eventUuid);

  const [editingAppointment, setEditingAppointment] = useState<AppointmentResponse | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<AppointmentResponse | null>(null);

  function handleExportAll() {
    if (!appointments || appointments.length === 0) return;
    const content = generateICSContent(appointments);
    downloadICS(content, `appointments-${eventUuid}.ics`);
  }

  function handleConfirmCancel() {
    if (!cancellingAppointment) return;
    const appt = cancellingAppointment;
    cancelAppointment.mutate(appt.id, {
      onSuccess: () => {
        createLogEntry.mutate({
          entityType: appt.entityType,
          linkId: appt.linkId,
          notes: `Appointment cancelled (was ${formatShortDateTime(appt.appointmentStart)})`,
        });
        setCancellingAppointment(null);
      },
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Upcoming Appointments</CardTitle>
          {appointments && appointments.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              className="h-8 gap-1.5 text-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export All
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="divide-y">
              <AppointmentItemSkeleton />
              <AppointmentItemSkeleton />
              <AppointmentItemSkeleton />
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">Failed to load appointments</p>
          ) : appointments && appointments.length > 0 ? (
            <div className="divide-y">
              {appointments.map((appt) => (
                <AppointmentItem
                  key={appt.id}
                  appointment={appt}
                  eventUuid={eventUuid}
                  onEdit={setEditingAppointment}
                  onCancel={setCancellingAppointment}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No upcoming appointments</p>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {editingAppointment && (
        <EditAppointmentDialog
          appointment={editingAppointment}
          eventUuid={eventUuid}
          open={editingAppointment !== null}
          onOpenChange={(open) => {
            if (!open) setEditingAppointment(null);
          }}
        />
      )}

      {/* Cancel confirmation */}
      <AlertDialog
        open={cancellingAppointment !== null}
        onOpenChange={(open) => {
          if (!open) setCancellingAppointment(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              The appointment with{' '}
              <span className="font-medium text-foreground">
                {cancellingAppointment?.entityName}
              </span>{' '}
              on{' '}
              {cancellingAppointment && formatAppointmentTime(cancellingAppointment.appointmentStart)}{' '}
              will be marked as cancelled and moved to the provider's activity log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelAppointment.isPending}>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelAppointment.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelAppointment.isPending ? 'Cancelling...' : 'Cancel Appointment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
