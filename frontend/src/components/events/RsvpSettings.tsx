/**
 * RSVP Settings Component
 *
 * Configure RSVP behavior for an event:
 * - Enable/disable RSVP
 * - Allow "Maybe" responses
 * - Set RSVP deadline
 * - Custom confirmation message
 * - Allow guests to update their RSVP
 * - Allow plus-ones via RSVP
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  useRsvpSettings,
  useUpdateRsvpSettings,
  type UpdateRsvpSettingsInput,
  type RsvpFormFields,
} from '@/hooks/use-events';

interface RsvpSettingsProps {
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

export function RsvpSettings({ eventUuid }: RsvpSettingsProps) {
  const { data: settings, isLoading } = useRsvpSettings(eventUuid);
  const updateSettings = useUpdateRsvpSettings(eventUuid);

  const [localSettings, setLocalSettings] = useState<Partial<UpdateRsvpSettingsInput>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Reset local state when server data loads
  useEffect(() => {
    if (settings) {
      setLocalSettings({});
      setHasChanges(false);
    }
  }, [settings?.updatedAt]);

  const defaultFormFields: RsvpFormFields = {
    dietaryRestrictions: true,
    mealChoice: false,
    notes: false,
    address: false,
    transportation: false,
    accessibility: false,
    customFields: false,
  };

  const current = {
    enableRsvp: localSettings.enableRsvp ?? settings?.enableRsvp ?? false,
    allowMaybeResponse: localSettings.allowMaybeResponse ?? settings?.allowMaybeResponse ?? true,
    rsvpDeadline: localSettings.rsvpDeadline !== undefined
      ? localSettings.rsvpDeadline
      : settings?.rsvpDeadline ? new Date(settings.rsvpDeadline) : null,
    rsvpConfirmationMessage: localSettings.rsvpConfirmationMessage !== undefined
      ? localSettings.rsvpConfirmationMessage
      : settings?.rsvpConfirmationMessage ?? null,
    allowRsvpUpdate: localSettings.allowRsvpUpdate ?? settings?.allowRsvpUpdate ?? true,
    allowRsvpPlusOnes: localSettings.allowRsvpPlusOnes ?? settings?.allowRsvpPlusOnes ?? false,
    rsvpFormFields: {
      ...defaultFormFields,
      ...(settings?.rsvpFormFields ?? {}),
      ...(localSettings.rsvpFormFields ?? {}),
    } as RsvpFormFields,
  };

  const handleChange = <K extends keyof UpdateRsvpSettingsInput>(
    key: K,
    value: UpdateRsvpSettingsInput[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleFormFieldChange = (field: keyof RsvpFormFields, value: boolean) => {
    const merged = { ...(localSettings.rsvpFormFields ?? {}), [field]: value };
    handleChange('rsvpFormFields', merged);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        enableRsvp: current.enableRsvp,
        allowMaybeResponse: current.allowMaybeResponse,
        rsvpDeadline: current.rsvpDeadline,
        rsvpConfirmationMessage: current.rsvpConfirmationMessage,
        allowRsvpUpdate: current.allowRsvpUpdate,
        allowRsvpPlusOnes: current.allowRsvpPlusOnes,
        rsvpFormFields: current.rsvpFormFields,
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
          <CardTitle>RSVP & Invitations</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>RSVP & Invitations</CardTitle>
        <CardDescription>
          Configure how guests can respond to your event invitation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-0 divide-y">
          <SettingRow
            label="Enable RSVP"
            description="Allow guests to respond to your event invitation"
            checked={current.enableRsvp}
            onCheckedChange={(checked) => handleChange('enableRsvp', checked)}
            disabled={updateSettings.isPending}
          />

          {current.enableRsvp && (
            <>
              <SettingRow
                label="Allow 'Maybe' responses"
                description="Let guests respond with 'Maybe' in addition to 'Yes' and 'No'"
                checked={current.allowMaybeResponse}
                onCheckedChange={(checked) => handleChange('allowMaybeResponse', checked)}
                disabled={updateSettings.isPending}
              />

              <div className="py-3 space-y-2">
                <Label className="text-base">RSVP Deadline</Label>
                <p className="text-sm text-muted-foreground">
                  Set an optional deadline for guests to respond
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-[240px] justify-start text-left font-normal',
                          !current.rsvpDeadline && 'text-muted-foreground'
                        )}
                        disabled={updateSettings.isPending}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {current.rsvpDeadline
                          ? format(current.rsvpDeadline, 'PPP')
                          : 'No deadline set'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={current.rsvpDeadline ?? undefined}
                        onSelect={(date) => handleChange('rsvpDeadline', date ?? null)}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  {current.rsvpDeadline && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChange('rsvpDeadline', null)}
                      disabled={updateSettings.isPending}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <div className="py-3 space-y-2">
                <Label className="text-base">Confirmation Message</Label>
                <p className="text-sm text-muted-foreground">
                  Optional message shown to guests after they RSVP (max 500 characters)
                </p>
                <Textarea
                  placeholder="Thank you for responding! We look forward to seeing you."
                  value={current.rsvpConfirmationMessage ?? ''}
                  onChange={(e) =>
                    handleChange(
                      'rsvpConfirmationMessage',
                      e.target.value || null
                    )
                  }
                  maxLength={500}
                  rows={3}
                  disabled={updateSettings.isPending}
                />
                {current.rsvpConfirmationMessage && (
                  <p className="text-xs text-muted-foreground text-right">
                    {current.rsvpConfirmationMessage.length}/500
                  </p>
                )}
              </div>

              <SettingRow
                label="Allow RSVP updates"
                description="Let guests change their response after submitting"
                checked={current.allowRsvpUpdate}
                onCheckedChange={(checked) => handleChange('allowRsvpUpdate', checked)}
                disabled={updateSettings.isPending}
              />

              <SettingRow
                label="Allow plus-ones via RSVP"
                description="Let guests add plus-ones when responding (requires plus-ones enabled in Guest Field Settings)"
                checked={current.allowRsvpPlusOnes}
                onCheckedChange={(checked) => handleChange('allowRsvpPlusOnes', checked)}
                disabled={updateSettings.isPending}
              />
            </>
          )}

          {/* RSVP Form Fields */}
          {current.enableRsvp && (
            <div className="pt-4">
              <h3 className="text-sm font-semibold mb-1">RSVP Form Fields</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Choose which fields guests can fill in on the RSVP form. Fields gated by Guest Field Settings must also be enabled there.
              </p>
              <div className="divide-y">
                <SettingRow
                  label="Dietary Restrictions"
                  description="Guests can specify dietary needs"
                  checked={current.rsvpFormFields.dietaryRestrictions ?? true}
                  onCheckedChange={(checked) => handleFormFieldChange('dietaryRestrictions', checked)}
                  disabled={updateSettings.isPending}
                />
                <SettingRow
                  label="Meal Choice"
                  description="Guests can select a meal option (requires Meal Choice enabled in Guest Field Settings)"
                  checked={current.rsvpFormFields.mealChoice ?? false}
                  onCheckedChange={(checked) => handleFormFieldChange('mealChoice', checked)}
                  disabled={updateSettings.isPending}
                />
                <SettingRow
                  label="Notes"
                  description="Guests can leave a note or message"
                  checked={current.rsvpFormFields.notes ?? false}
                  onCheckedChange={(checked) => handleFormFieldChange('notes', checked)}
                  disabled={updateSettings.isPending}
                />
                <SettingRow
                  label="Address"
                  description="Guests can provide their mailing address (requires Address enabled in Guest Field Settings)"
                  checked={current.rsvpFormFields.address ?? false}
                  onCheckedChange={(checked) => handleFormFieldChange('address', checked)}
                  disabled={updateSettings.isPending}
                />
                <SettingRow
                  label="Transportation"
                  description="Guests can indicate if they need transportation (requires Transportation enabled in Guest Field Settings)"
                  checked={current.rsvpFormFields.transportation ?? false}
                  onCheckedChange={(checked) => handleFormFieldChange('transportation', checked)}
                  disabled={updateSettings.isPending}
                />
                <SettingRow
                  label="Accessibility"
                  description="Guests can specify accessibility needs (requires Accessibility enabled in Guest Field Settings)"
                  checked={current.rsvpFormFields.accessibility ?? false}
                  onCheckedChange={(checked) => handleFormFieldChange('accessibility', checked)}
                  disabled={updateSettings.isPending}
                />
                <SettingRow
                  label="Custom Fields"
                  description="Show custom fields defined in Guest Field Settings"
                  checked={current.rsvpFormFields.customFields ?? false}
                  onCheckedChange={(checked) => handleFormFieldChange('customFields', checked)}
                  disabled={updateSettings.isPending}
                />
              </div>
            </div>
          )}
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
