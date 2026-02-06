/**
 * Guest Field Settings Component
 *
 * Configuration UI for enabling/disabling optional guest fields
 * and configuring options (e.g., meal choices).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useGuestSettings,
  useUpdateGuestSettings,
  type EventGuestSettings,
  type MealChoiceOption,
} from '@/hooks/use-guests';

interface GuestFieldSettingsProps {
  eventUuid: string;
}

interface FieldToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function FieldToggle({ label, description, checked, onCheckedChange, disabled }: FieldToggleProps) {
  return (
    <div className="flex items-center justify-between">
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

interface MealChoiceEditorProps {
  options: MealChoiceOption[];
  onChange: (options: MealChoiceOption[]) => void;
  disabled?: boolean;
}

function MealChoiceEditor({ options, onChange, disabled }: MealChoiceEditorProps) {
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const handleAdd = () => {
    if (!newKey.trim() || !newLabel.trim()) return;
    
    // Ensure key is unique
    const key = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (options.some(o => o.key === key)) return;
    
    onChange([...options, { key, label: newLabel.trim() }]);
    setNewKey('');
    setNewLabel('');
  };

  const handleRemove = (key: string) => {
    onChange(options.filter(o => o.key !== key));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3 ml-4 mt-2">
      <Label className="text-sm font-medium">Meal Options</Label>
      
      {/* Existing options */}
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.key} className="flex items-center gap-2">
            <span className="flex-1 text-sm px-3 py-2 bg-muted rounded-md flex items-center gap-2">
              <span className="font-medium">{option.label}</span>
              <span className="text-muted-foreground text-xs">({option.key})</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemove(option.key)}
              disabled={disabled}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>
        ))}
      </div>

      {/* Add new option */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Key (e.g., chicken)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="flex-1"
        />
        <Input
          placeholder="Label (e.g., Grilled Chicken)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || !newKey.trim() || !newLabel.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

export function GuestFieldSettings({ eventUuid }: GuestFieldSettingsProps) {
  const { data: settings, isLoading } = useGuestSettings(eventUuid);
  const updateSettings = useUpdateGuestSettings(eventUuid);

  const [localSettings, setLocalSettings] = useState<Partial<EventGuestSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Merge server settings with local changes
  const currentSettings: EventGuestSettings = {
    id: settings?.id ?? 0,
    eventId: settings?.eventId ?? 0,
    enableAddress: localSettings.enableAddress ?? settings?.enableAddress ?? false,
    enableMealChoice: localSettings.enableMealChoice ?? settings?.enableMealChoice ?? false,
    enableAccommodation: localSettings.enableAccommodation ?? settings?.enableAccommodation ?? false,
    enablePlusOneName: localSettings.enablePlusOneName ?? settings?.enablePlusOneName ?? false,
    enableTableAssignment: localSettings.enableTableAssignment ?? settings?.enableTableAssignment ?? false,
    enableTransportation: localSettings.enableTransportation ?? settings?.enableTransportation ?? false,
    enableAccessibility: localSettings.enableAccessibility ?? settings?.enableAccessibility ?? false,
    mealChoiceOptions: localSettings.mealChoiceOptions ?? settings?.mealChoiceOptions ?? [],
    customFieldDefinitions: settings?.customFieldDefinitions ?? [],
    createdAt: settings?.createdAt ?? '',
    updatedAt: settings?.updatedAt ?? '',
  };

  const handleChange = (key: keyof EventGuestSettings, value: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(localSettings);
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
          <CardTitle>Guest Field Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guest Field Settings</CardTitle>
        <CardDescription>
          Configure which optional fields to collect for guests at this event.
          Changes will apply to new guests and when editing existing guests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact & Address */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Contact Information
          </h3>
          <FieldToggle
            label="Address"
            description="Collect mailing address (street, city, state, zip, country)"
            checked={currentSettings.enableAddress}
            onCheckedChange={(checked) => handleChange('enableAddress', checked)}
            disabled={updateSettings.isPending}
          />
        </div>

        <Separator />

        {/* Dietary & Seating */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Dietary & Seating
          </h3>
          
          <FieldToggle
            label="Meal Choice"
            description="Let guests select their meal preference"
            checked={currentSettings.enableMealChoice}
            onCheckedChange={(checked) => handleChange('enableMealChoice', checked)}
            disabled={updateSettings.isPending}
          />

          {currentSettings.enableMealChoice && (
            <MealChoiceEditor
              options={currentSettings.mealChoiceOptions ?? []}
              onChange={(options) => handleChange('mealChoiceOptions', options)}
              disabled={updateSettings.isPending}
            />
          )}

          <FieldToggle
            label="Table Assignment"
            description="Assign guests to specific tables"
            checked={currentSettings.enableTableAssignment}
            onCheckedChange={(checked) => handleChange('enableTableAssignment', checked)}
            disabled={updateSettings.isPending}
          />
        </div>

        <Separator />

        {/* Logistics */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Logistics
          </h3>

          <FieldToggle
            label="Accommodation"
            description="Track if guests need hotel accommodation"
            checked={currentSettings.enableAccommodation}
            onCheckedChange={(checked) => handleChange('enableAccommodation', checked)}
            disabled={updateSettings.isPending}
          />

          <FieldToggle
            label="Transportation"
            description="Track if guests need transportation assistance"
            checked={currentSettings.enableTransportation}
            onCheckedChange={(checked) => handleChange('enableTransportation', checked)}
            disabled={updateSettings.isPending}
          />
        </div>

        <Separator />

        {/* Additional Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Additional Information
          </h3>

          <FieldToggle
            label="Plus-One Name"
            description="Capture the name of the guest's plus-one"
            checked={currentSettings.enablePlusOneName}
            onCheckedChange={(checked) => handleChange('enablePlusOneName', checked)}
            disabled={updateSettings.isPending}
          />

          <FieldToggle
            label="Accessibility Needs"
            description="Allow guests to specify accessibility requirements"
            checked={currentSettings.enableAccessibility}
            onCheckedChange={(checked) => handleChange('enableAccessibility', checked)}
            disabled={updateSettings.isPending}
          />
        </div>

        {/* Save/Reset Buttons */}
        {hasChanges && (
          <>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={updateSettings.isPending}
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface GuestFieldSettingsDialogProps {
  eventUuid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuestFieldSettingsDialog({
  eventUuid,
  open,
  onOpenChange,
}: GuestFieldSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Guest Field Settings</DialogTitle>
          <DialogDescription>
            Configure which optional fields to collect for guests.
          </DialogDescription>
        </DialogHeader>
        <GuestFieldSettings eventUuid={eventUuid} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GuestFieldSettings;
