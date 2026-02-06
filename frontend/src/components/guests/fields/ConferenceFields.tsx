/**
 * Conference Guest Fields Component
 *
 * Renders conference-specific fields for guest forms:
 * - Badge type
 * - Organization
 * - Session registrations
 * - Special access
 * - Attending days
 */

import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ConferenceGuestDetails, BadgeType } from '@/hooks/use-guests';

const BADGE_TYPES: { value: BadgeType; label: string; description: string }[] = [
  { value: 'speaker', label: 'Speaker', description: 'Presenting at the conference' },
  { value: 'vip', label: 'VIP', description: 'Special VIP access' },
  { value: 'standard', label: 'Standard', description: 'Regular attendee' },
  { value: 'press', label: 'Press', description: 'Media/Press credentials' },
  { value: 'exhibitor', label: 'Exhibitor', description: 'Booth/Exhibit staff' },
  { value: 'staff', label: 'Staff', description: 'Event staff' },
];

interface ConferenceFieldsProps {
  values?: Partial<ConferenceGuestDetails> | null;
  onChange?: (values: Partial<ConferenceGuestDetails>) => void;
  disabled?: boolean;
}

export function ConferenceFields({ values, onChange, disabled }: ConferenceFieldsProps) {
  const handleChange = (field: keyof ConferenceGuestDetails, value: unknown) => {
    onChange?.({
      ...values,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">Conference Details</h4>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Badge Type */}
        <div className="space-y-2">
          <Label htmlFor="badgeType">Badge Type</Label>
          <Select
            value={values?.badgeType ?? 'standard'}
            onValueChange={(value) => handleChange('badgeType', value || 'standard')}
            disabled={disabled}
          >
            <SelectTrigger id="badgeType">
              <SelectValue placeholder="Select badge type..." />
            </SelectTrigger>
            <SelectContent>
              {BADGE_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <span>{option.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({option.description})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Organization */}
        <div className="space-y-2">
          <Label htmlFor="organization">Organization</Label>
          <Input
            id="organization"
            placeholder="Enter organization name..."
            value={values?.organization ?? ''}
            onChange={(e) => handleChange('organization', e.target.value || null)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Special Access */}
      <div className="flex items-center gap-2 rounded-lg border p-3">
        <input
          type="checkbox"
          id="specialAccess"
          checked={values?.specialAccess ?? false}
          onChange={(e) => handleChange('specialAccess', e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-gray-300"
        />
        <div>
          <Label htmlFor="specialAccess" className="font-normal">
            Special Access
          </Label>
          <p className="text-xs text-muted-foreground">
            Grant access to VIP areas, backstage, or restricted zones
          </p>
        </div>
      </div>

      {/* Session Registrations - simplified as comma-separated input */}
      <div className="space-y-2">
        <Label htmlFor="sessionRegistrations">Session Registrations</Label>
        <Input
          id="sessionRegistrations"
          placeholder="Enter session IDs (comma-separated)..."
          value={(values?.sessionRegistrations ?? []).join(', ')}
          onChange={(e) => {
            const sessions = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            handleChange('sessionRegistrations', sessions.length > 0 ? sessions : null);
          }}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Enter session IDs separated by commas (e.g., "session-1, session-2")
        </p>
      </div>

      {/* Attending Days - simplified as comma-separated input */}
      <div className="space-y-2">
        <Label htmlFor="attendingDays">Attending Days</Label>
        <Input
          id="attendingDays"
          placeholder="Enter days attending (comma-separated)..."
          value={(values?.attendingDays ?? []).join(', ')}
          onChange={(e) => {
            const days = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            handleChange('attendingDays', days.length > 0 ? days : null);
          }}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Enter days separated by commas (e.g., "Day 1, Day 2, Day 3")
        </p>
      </div>
    </div>
  );
}

/**
 * Conference Fields for react-hook-form integration
 */
export function ConferenceFieldsRHF({ disabled }: { disabled?: boolean }) {
  const { watch, setValue } = useFormContext();
  const conferenceDetails = watch('conferenceDetails') || {};

  return (
    <ConferenceFields
      values={conferenceDetails}
      onChange={(values) => setValue('conferenceDetails', values, { shouldDirty: true })}
      disabled={disabled}
    />
  );
}

export default ConferenceFields;
