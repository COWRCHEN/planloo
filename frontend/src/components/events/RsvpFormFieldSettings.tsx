/**
 * RSVP Form Field Settings Component
 *
 * Configure which fields appear on the RSVP form:
 * - Dietary Restrictions, Meal Choice, Notes
 * - Address, Transportation, Accessibility
 * - Custom Fields
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useRsvpSettings,
  useUpdateRsvpSettings,
  type RsvpFormFields,
} from '@/hooks/use-events';

interface RsvpFormFieldSettingsProps {
  eventUuid: string;
}

interface SettingRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function SettingRow({ label, description, checked, onCheckedChange, disabled }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <Label className="text-base">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

const defaultFormFields: RsvpFormFields = {
  dietaryRestrictions: true,
  mealChoice: false,
  notes: false,
  address: false,
  transportation: false,
  accessibility: false,
  customFields: false,
};

export function RsvpFormFieldSettings({ eventUuid }: RsvpFormFieldSettingsProps) {
  const { data: settings, isLoading } = useRsvpSettings(eventUuid);
  const updateSettings = useUpdateRsvpSettings(eventUuid);

  const [localFormFields, setLocalFormFields] = useState<Partial<RsvpFormFields>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Reset local state when server data loads
  useEffect(() => {
    if (settings) {
      setLocalFormFields({});
      setHasChanges(false);
    }
  }, [settings?.updatedAt]);

  const currentFormFields: RsvpFormFields = {
    ...defaultFormFields,
    ...(settings?.rsvpFormFields ?? {}),
    ...localFormFields,
  };

  const handleFormFieldChange = (field: keyof RsvpFormFields, value: boolean) => {
    setLocalFormFields((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        rsvpFormFields: currentFormFields,
      });
      setLocalFormFields({});
      setHasChanges(false);
    } catch {
      // Error handling is done in the mutation
    }
  };

  const handleReset = () => {
    setLocalFormFields({});
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>RSVP Form Fields</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>RSVP Form Fields</CardTitle>
        <CardDescription>
          Choose which fields guests can fill in on the RSVP form. Fields gated by Guest Field Settings must also be enabled there.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="divide-y">
          <SettingRow
            label="Dietary Restrictions"
            description="Guests can specify dietary needs"
            checked={currentFormFields.dietaryRestrictions ?? true}
            onCheckedChange={(checked) => handleFormFieldChange('dietaryRestrictions', checked)}
            disabled={updateSettings.isPending}
          />
          <SettingRow
            label="Meal Choice"
            description="Guests can select a meal option (requires Meal Choice enabled in Guest Field Settings)"
            checked={currentFormFields.mealChoice ?? false}
            onCheckedChange={(checked) => handleFormFieldChange('mealChoice', checked)}
            disabled={updateSettings.isPending}
          />
          <SettingRow
            label="Notes"
            description="Guests can leave a note or message"
            checked={currentFormFields.notes ?? false}
            onCheckedChange={(checked) => handleFormFieldChange('notes', checked)}
            disabled={updateSettings.isPending}
          />
          <SettingRow
            label="Address"
            description="Guests can provide their mailing address (requires Address enabled in Guest Field Settings)"
            checked={currentFormFields.address ?? false}
            onCheckedChange={(checked) => handleFormFieldChange('address', checked)}
            disabled={updateSettings.isPending}
          />
          <SettingRow
            label="Transportation"
            description="Guests can indicate if they need transportation (requires Transportation enabled in Guest Field Settings)"
            checked={currentFormFields.transportation ?? false}
            onCheckedChange={(checked) => handleFormFieldChange('transportation', checked)}
            disabled={updateSettings.isPending}
          />
          <SettingRow
            label="Accessibility"
            description="Guests can specify accessibility needs (requires Accessibility enabled in Guest Field Settings)"
            checked={currentFormFields.accessibility ?? false}
            onCheckedChange={(checked) => handleFormFieldChange('accessibility', checked)}
            disabled={updateSettings.isPending}
          />
          <SettingRow
            label="Custom Fields"
            description="Show custom fields defined in Guest Field Settings"
            checked={currentFormFields.customFields ?? false}
            onCheckedChange={(checked) => handleFormFieldChange('customFields', checked)}
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
