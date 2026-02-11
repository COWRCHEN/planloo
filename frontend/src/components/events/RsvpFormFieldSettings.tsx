/**
 * RSVP Form Field Settings Component
 *
 * Configure which fields appear on the RSVP form:
 * - Dietary Restrictions, Meal Choice, Notes
 * - Address, Transportation, Accessibility
 * - Custom Fields
 * - Allow plus-ones via RSVP
 * - Custom confirmation message
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  const [localAllowPlusOnes, setLocalAllowPlusOnes] = useState<boolean | undefined>(undefined);
  const [localConfirmationMessage, setLocalConfirmationMessage] = useState<string | null | undefined>(undefined);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset local state when server data loads
  useEffect(() => {
    if (settings) {
      setLocalFormFields({});
      setLocalAllowPlusOnes(undefined);
      setLocalConfirmationMessage(undefined);
      setHasChanges(false);
    }
  }, [settings?.updatedAt]);

  const currentFormFields: RsvpFormFields = {
    ...defaultFormFields,
    ...(settings?.rsvpFormFields ?? {}),
    ...localFormFields,
  };

  const currentAllowPlusOnes = localAllowPlusOnes ?? settings?.allowRsvpPlusOnes ?? false;
  const currentConfirmationMessage = localConfirmationMessage !== undefined
    ? localConfirmationMessage
    : settings?.rsvpConfirmationMessage ?? null;

  const handleFormFieldChange = (field: keyof RsvpFormFields, value: boolean) => {
    setLocalFormFields((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        rsvpFormFields: currentFormFields,
        allowRsvpPlusOnes: currentAllowPlusOnes,
        rsvpConfirmationMessage: currentConfirmationMessage,
      });
      setLocalFormFields({});
      setLocalAllowPlusOnes(undefined);
      setLocalConfirmationMessage(undefined);
      setHasChanges(false);
    } catch {
      // Error handling is done in the mutation
    }
  };

  const handleReset = () => {
    setLocalFormFields({});
    setLocalAllowPlusOnes(undefined);
    setLocalConfirmationMessage(undefined);
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
          <SettingRow
            label="Allow plus-ones via RSVP"
            description="Let guests add plus-ones when responding (requires plus-ones enabled in Guest Field Settings)"
            checked={currentAllowPlusOnes}
            onCheckedChange={(checked) => {
              setLocalAllowPlusOnes(checked);
              setHasChanges(true);
            }}
            disabled={updateSettings.isPending}
          />
          <div className="py-3 space-y-2">
            <Label className="text-base">Confirmation Message</Label>
            <p className="text-sm text-muted-foreground">
              Optional message shown to guests after they RSVP (max 500 characters)
            </p>
            <Textarea
              placeholder="Thank you for responding! We look forward to seeing you."
              value={currentConfirmationMessage ?? ''}
              onChange={(e) => {
                setLocalConfirmationMessage(e.target.value || null);
                setHasChanges(true);
              }}
              maxLength={500}
              rows={3}
              disabled={updateSettings.isPending}
            />
            {currentConfirmationMessage && (
              <p className="text-xs text-muted-foreground text-right">
                {currentConfirmationMessage.length}/500
              </p>
            )}
          </div>
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
