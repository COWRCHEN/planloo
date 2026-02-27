/**
 * Event Upcoming Appointments Component
 *
 * Displays upcoming scheduled appointments with providers/venues for an event,
 * sorted by appointment start time.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEventAppointments, type AppointmentResponse } from '@/hooks/use-providers';

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

interface AppointmentItemProps {
  appointment: AppointmentResponse;
  eventUuid: string;
}

function AppointmentItem({ appointment, eventUuid }: AppointmentItemProps) {
  return (
    <a
      href={`/dashboard/events/${eventUuid}/providers`}
      className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-md transition-colors hover:bg-muted/50"
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
  );
}

interface EventUpcomingAppointmentsProps {
  eventUuid: string;
}

export function EventUpcomingAppointments({ eventUuid }: EventUpcomingAppointmentsProps) {
  const { data: appointments, isLoading, error } = useEventAppointments(eventUuid);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Appointments</CardTitle>
      </CardHeader>
      <CardContent>
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
              <AppointmentItem key={appt.id} appointment={appt} eventUuid={eventUuid} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No upcoming appointments</p>
        )}
      </CardContent>
    </Card>
  );
}
