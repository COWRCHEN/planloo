/**
 * Event Status Select
 *
 * Dropdown to change event status, displayed as a styled badge-like trigger.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateEvent, type EventStatus } from '@/hooks/use-events';

const STATUS_OPTIONS: { value: EventStatus; label: string; className: string }[] = [
  { value: 'draft', label: 'Draft', className: 'text-slate-700' },
  { value: 'planning', label: 'Planning', className: 'text-blue-700' },
  { value: 'confirmed', label: 'Confirmed', className: 'text-green-700' },
  { value: 'completed', label: 'Completed', className: 'text-purple-700' },
  { value: 'cancelled', label: 'Cancelled', className: 'text-red-700' },
];

const statusTriggerStyles: Record<EventStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
  planning: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  confirmed: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  completed: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
};

interface EventStatusSelectProps {
  uuid: string;
  currentStatus: EventStatus;
}

export function EventStatusSelect({ uuid, currentStatus }: EventStatusSelectProps) {
  const updateEvent = useUpdateEvent(uuid);

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentStatus) return;
    updateEvent.mutate({ status: newStatus as EventStatus });
  };

  return (
    <Select value={currentStatus} onValueChange={handleStatusChange} disabled={updateEvent.isPending}>
      <SelectTrigger
        className={`h-7 w-auto gap-1.5 rounded-full border px-3 text-xs font-semibold ${statusTriggerStyles[currentStatus]} ${updateEvent.isPending ? 'opacity-60' : ''}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className={`font-medium ${option.className}`}>{option.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
