/**
 * Common Field Settings Component
 *
 * Configure which base guest fields (First Name, Last Name, Email, Phone)
 * are required for this event.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useGuestSettings,
  useUpdateGuestSettings,
  type EventGuestSettings,
} from '@/hooks/use-guests';

interface CommonFieldSettingsProps {
  eventUuid: string;
}

interface RequiredRowProps {
  label: string;
  description: string;
  required: boolean;
  onRequiredChange: (checked: boolean) => void;
  disabled?: boolean;
}

function RequiredRow({
  label,
  description,
  required,
  onRequiredChange,
  disabled,
}: RequiredRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Label className="text-base">{label}</Label>
          {required && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center space-x-2 shrink-0">
        <Switch
          id={`required-${label.replace(/\s+/g, '-').toLowerCase()}`}
          checked={required}
          onCheckedChange={onRequiredChange}
          disabled={disabled}
        />
        <Label
          htmlFor={`required-${label.replace(/\s+/g, '-').toLowerCase()}`}
          className="font-normal text-sm"
        >
          Required
        </Label>
      </div>
    </div>
  );
}

export function CommonFieldSettings({ eventUuid }: CommonFieldSettingsProps) {
  const { data: settings, isLoading } = useGuestSettings(eventUuid);
  const updateSettings = useUpdateGuestSettings(eventUuid);

  const [localSettings, setLocalSettings] = useState<Partial<EventGuestSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const currentSettings = {
    requiredFirstName: localSettings.requiredFirstName ?? settings?.requiredFirstName ?? true,
    requiredLastName: localSettings.requiredLastName ?? settings?.requiredLastName ?? false,
    requiredEmail: localSettings.requiredEmail ?? settings?.requiredEmail ?? false,
    requiredPhone: localSettings.requiredPhone ?? settings?.requiredPhone ?? false,
  };

  const handleChange = (key: 'requiredFirstName' | 'requiredLastName' | 'requiredEmail' | 'requiredPhone', value: boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        requiredFirstName: currentSettings.requiredFirstName,
        requiredLastName: currentSettings.requiredLastName,
        requiredEmail: currentSettings.requiredEmail,
        requiredPhone: currentSettings.requiredPhone,
      });
      setLocalSettings({});
      setHasChanges(false);
    } catch {
      // Error handling is done in the mutation
    }
  };

  const handleReset = () => {
    setLocalSettings({});
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Common Fields</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Common Fields</CardTitle>
        <CardDescription>
          Choose which base guest fields are required when adding or editing guests.
          First name is required by default; you can require last name, email, or phone as needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-0 divide-y">
          <RequiredRow
            label="First Name"
            description="Guest's first name"
            required={currentSettings.requiredFirstName}
            onRequiredChange={(checked) => handleChange('requiredFirstName', checked)}
            disabled={updateSettings.isPending}
          />
          <RequiredRow
            label="Last Name"
            description="Guest's last name"
            required={currentSettings.requiredLastName}
            onRequiredChange={(checked) => handleChange('requiredLastName', checked)}
            disabled={updateSettings.isPending}
          />
          <RequiredRow
            label="Email"
            description="Email address for updates and RSVP"
            required={currentSettings.requiredEmail}
            onRequiredChange={(checked) => handleChange('requiredEmail', checked)}
            disabled={updateSettings.isPending}
          />
          <RequiredRow
            label="Phone"
            description="Phone number for contact"
            required={currentSettings.requiredPhone}
            onRequiredChange={(checked) => handleChange('requiredPhone', checked)}
            disabled={updateSettings.isPending}
          />
        </div>

        {hasChanges && (
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Saving...' : 'Save changes'}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={updateSettings.isPending}>
              Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
