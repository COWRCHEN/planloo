/**
 * RSVP Form Field Settings Component
 *
 * Configure which fields appear on the RSVP form, organized into tabs:
 * - Common Fields: Dietary Restrictions, Notes
 * - Guest Fields: Meal Choice, Address, Transportation, Accessibility, Plus-ones
 * - Custom Fields: Per-field toggles for each custom field defined in Guest Field Settings
 * - Others: Confirmation message
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useRsvpSettings,
  useUpdateRsvpSettings,
  type RsvpFormFields,
} from '@/hooks/use-events';
import { useGuestSettings } from '@/hooks/use-guests';

interface RsvpFormFieldSettingsProps {
  eventUuid: string;
}

interface SettingRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
}

function SettingRow({ label, description, checked, onCheckedChange, disabled, required }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-1">
          <Label className="text-base">{label}</Label>
          {required && <span className="text-destructive">*</span>}
        </div>
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
  customFields: {},
};

export function RsvpFormFieldSettings({ eventUuid }: RsvpFormFieldSettingsProps) {
  const { data: settings, isLoading } = useRsvpSettings(eventUuid);
  const { data: guestSettings } = useGuestSettings(eventUuid);
  const updateSettings = useUpdateRsvpSettings(eventUuid);

  const [localFormFields, setLocalFormFields] = useState<Partial<RsvpFormFields>>({});
  const [localCustomFields, setLocalCustomFields] = useState<Record<string, boolean> | undefined>(undefined);
  const [localAllowPlusOnes, setLocalAllowPlusOnes] = useState<boolean | undefined>(undefined);
  const [localConfirmationMessage, setLocalConfirmationMessage] = useState<string | null | undefined>(undefined);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset local state when server data loads
  useEffect(() => {
    if (settings) {
      setLocalFormFields({});
      setLocalCustomFields(undefined);
      setLocalAllowPlusOnes(undefined);
      setLocalConfirmationMessage(undefined);
      setHasChanges(false);
    }
  }, [settings?.updatedAt]);

  // Merge server customFields (backward compat: boolean → empty record)
  const serverCustomFields: Record<string, boolean> =
    settings?.rsvpFormFields?.customFields && typeof settings.rsvpFormFields.customFields === 'object'
      ? settings.rsvpFormFields.customFields
      : {};

  const currentCustomFields: Record<string, boolean> = {
    ...serverCustomFields,
    ...(localCustomFields ?? {}),
  };

  const currentFormFields: RsvpFormFields = {
    ...defaultFormFields,
    ...(settings?.rsvpFormFields ?? {}),
    ...localFormFields,
    customFields: currentCustomFields,
  };

  const currentAllowPlusOnes = localAllowPlusOnes ?? settings?.allowRsvpPlusOnes ?? false;
  const currentConfirmationMessage = localConfirmationMessage !== undefined
    ? localConfirmationMessage
    : settings?.rsvpConfirmationMessage ?? null;

  const handleFormFieldChange = (field: keyof Omit<RsvpFormFields, 'customFields'>, value: boolean) => {
    setLocalFormFields((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleCustomFieldToggle = (fieldId: string, enabled: boolean) => {
    setLocalCustomFields((prev) => ({ ...(prev ?? {}), [fieldId]: enabled }));
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
      setLocalCustomFields(undefined);
      setLocalAllowPlusOnes(undefined);
      setLocalConfirmationMessage(undefined);
      setHasChanges(false);
    } catch {
      // Error handling is done in the mutation
    }
  };

  const handleReset = () => {
    setLocalFormFields({});
    setLocalCustomFields(undefined);
    setLocalAllowPlusOnes(undefined);
    setLocalConfirmationMessage(undefined);
    setHasChanges(false);
  };

  const customFieldDefinitions = guestSettings?.customFieldDefinitions ?? [];

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
        <Tabs defaultValue="common-fields" className="space-y-4">
          <TabsList>
            <TabsTrigger value="common-fields">Common Fields</TabsTrigger>
            <TabsTrigger value="guest-fields">Guest Fields</TabsTrigger>
            <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
            <TabsTrigger value="others">Others</TabsTrigger>
          </TabsList>

          {/* Common Fields — fields not gated by Guest Field Settings */}
          <TabsContent value="common-fields">
            <div className="divide-y">
              <SettingRow
                label="Dietary Restrictions"
                description="Guests can specify dietary needs"
                checked={currentFormFields.dietaryRestrictions ?? true}
                onCheckedChange={(checked) => handleFormFieldChange('dietaryRestrictions', checked)}
                disabled={updateSettings.isPending}
              />
              <SettingRow
                label="Notes"
                description="Guests can leave a note or message"
                checked={currentFormFields.notes ?? false}
                onCheckedChange={(checked) => handleFormFieldChange('notes', checked)}
                disabled={updateSettings.isPending}
              />
            </div>
          </TabsContent>

          {/* Guest Fields — fields gated by Guest Field Settings */}
          <TabsContent value="guest-fields">
            <div className="divide-y">
              <SettingRow
                label="Meal Choice"
                description="Guests can select a meal option (requires Meal Choice enabled in Guest Field Settings)"
                checked={currentFormFields.mealChoice ?? false}
                onCheckedChange={(checked) => handleFormFieldChange('mealChoice', checked)}
                disabled={updateSettings.isPending}
                required={!!guestSettings?.requiredMealChoice}
              />
              <SettingRow
                label="Address"
                description="Guests can provide their mailing address (requires Address enabled in Guest Field Settings)"
                checked={currentFormFields.address ?? false}
                onCheckedChange={(checked) => handleFormFieldChange('address', checked)}
                disabled={updateSettings.isPending}
                required={!!guestSettings?.requiredAddress}
              />
              <SettingRow
                label="Transportation"
                description="Guests can indicate if they need transportation (requires Transportation enabled in Guest Field Settings)"
                checked={currentFormFields.transportation ?? false}
                onCheckedChange={(checked) => handleFormFieldChange('transportation', checked)}
                disabled={updateSettings.isPending}
                required={!!guestSettings?.requiredTransportation}
              />
              <SettingRow
                label="Accessibility"
                description="Guests can specify accessibility needs (requires Accessibility enabled in Guest Field Settings)"
                checked={currentFormFields.accessibility ?? false}
                onCheckedChange={(checked) => handleFormFieldChange('accessibility', checked)}
                disabled={updateSettings.isPending}
                required={!!guestSettings?.requiredAccessibility}
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
            </div>
          </TabsContent>

          {/* Custom Fields — individual toggles for each custom field */}
          <TabsContent value="custom-fields">
            {customFieldDefinitions.length > 0 ? (
              <div className="divide-y">
                {customFieldDefinitions.map((field) => (
                  <div key={field.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Label className="text-base">{field.label}</Label>
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                        {field.required && (
                          <span className="text-destructive">*</span>
                        )}
                      </div>
                      {field.helpText && (
                        <p className="text-sm text-muted-foreground">{field.helpText}</p>
                      )}
                    </div>
                    <Switch
                      checked={currentCustomFields[field.id] ?? false}
                      onCheckedChange={(checked) => handleCustomFieldToggle(field.id, checked)}
                      disabled={updateSettings.isPending}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No custom fields defined yet.</p>
                <p className="text-xs mt-1">
                  Create custom fields in Guest Field Settings to enable them here.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Others — confirmation message and misc */}
          <TabsContent value="others">
            <div className="space-y-2">
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
          </TabsContent>
        </Tabs>

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
