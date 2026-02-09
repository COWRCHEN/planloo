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
  Contact,
  UtensilsCrossed,
  Hotel,
  FileText,
} from 'lucide-react';
import {
  useGuestSettings,
  useUpdateGuestSettings,
  DEFAULT_CATEGORY_OPTIONS,
  type AccommodationHotel,
  type EventGuestSettings,
  type MealChoiceOption,
  type UpdateGuestSettingsInput,
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
  /** When true, show a "Required" toggle (only applies when field is enabled) */
  required?: boolean;
  onRequiredChange?: (checked: boolean) => void;
  showRequired?: boolean;
}

function FieldToggle({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  required = false,
  onRequiredChange,
  showRequired = false,
}: FieldToggleProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Label className="text-base">{label}</Label>
            {showRequired && required && (
               <span className="ml-1 text-destructive">*</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
      {showRequired && onRequiredChange && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id={`required-${label.replace(/\s+/g, '-')}`}
              checked={required}
              onCheckedChange={onRequiredChange}
              disabled={disabled}
            />
            <Label htmlFor={`required-${label.replace(/\s+/g, '-')}`} className="font-normal">
              Required field
            </Label>
          </div>
        </div>
      )}
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

interface AccommodationHotelsEditorProps {
  hotels: AccommodationHotel[];
  onChange: (hotels: AccommodationHotel[]) => void;
  disabled?: boolean;
}

const emptyHotelAddress = (): Pick<
  AccommodationHotel,
  'streetNo' | 'street' | 'city' | 'state' | 'zip' | 'country'
> => ({
  streetNo: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  country: '',
});

function AccommodationHotelsEditor({ hotels, onChange, disabled }: AccommodationHotelsEditorProps) {
  const addHotel = () => {
    const id = `hotel-${Date.now()}`;
    onChange([...hotels, { id, name: '', ...emptyHotelAddress() }]);
  };

  const updateHotel = (index: number, updates: Partial<AccommodationHotel>) => {
    const next = [...hotels];
    next[index] = { ...next[index]!, ...updates };
    onChange(next);
  };

  const removeHotel = (index: number) => {
    onChange(hotels.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 ml-4 mt-2">
      <Label className="text-sm font-medium">Hotels for this event</Label>
      <p className="text-xs text-muted-foreground">
        Add hotel names and optional address details. Guests will select one. Check-in and check-out dates are set
        once for the whole event below.
      </p>
      <div className="space-y-2">
        {hotels.map((hotel, index) => (
          <div key={hotel.id} className="flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Hotel name"
                value={hotel.name}
                onChange={(e) => updateHotel(index, { name: e.target.value })}
                disabled={disabled}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeHotel(index)}
                disabled={disabled}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                placeholder="Street no. (optional)"
                value={hotel.streetNo ?? ''}
                onChange={(e) => updateHotel(index, { streetNo: e.target.value })}
                disabled={disabled}
              />
              <Input
                placeholder="Street (optional)"
                value={hotel.street ?? ''}
                onChange={(e) => updateHotel(index, { street: e.target.value })}
                disabled={disabled}
              />
              <Input
                placeholder="City (optional)"
                value={hotel.city ?? ''}
                onChange={(e) => updateHotel(index, { city: e.target.value })}
                disabled={disabled}
              />
              <Input
                placeholder="State (optional)"
                value={hotel.state ?? ''}
                onChange={(e) => updateHotel(index, { state: e.target.value })}
                disabled={disabled}
              />
              <Input
                placeholder="ZIP (optional)"
                value={hotel.zip ?? ''}
                onChange={(e) => updateHotel(index, { zip: e.target.value })}
                disabled={disabled}
              />
              <Input
                placeholder="Country (optional)"
                value={hotel.country ?? ''}
                onChange={(e) => updateHotel(index, { country: e.target.value })}
                disabled={disabled}
              />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addHotel} disabled={disabled}>
          Add hotel
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

  // Merge server settings with local changes (required* default false for backwards compatibility)
  const currentSettings: EventGuestSettings = {
    id: settings?.id ?? 0,
    eventId: settings?.eventId ?? 0,
    eventType: settings?.eventType ?? null,
    enableAddress: localSettings.enableAddress ?? settings?.enableAddress ?? false,
    enableMealChoice: localSettings.enableMealChoice ?? settings?.enableMealChoice ?? false,
    enableAccommodation: localSettings.enableAccommodation ?? settings?.enableAccommodation ?? false,
    enablePlusOnes: localSettings.enablePlusOnes ?? settings?.enablePlusOnes ?? false,
    defaultPlusOnesAllowed: localSettings.defaultPlusOnesAllowed ?? settings?.defaultPlusOnesAllowed ?? 0,
    enablePlusOneName: localSettings.enablePlusOneName ?? settings?.enablePlusOneName ?? false,
    enableTableAssignment: localSettings.enableTableAssignment ?? settings?.enableTableAssignment ?? false,
    enableTransportation: localSettings.enableTransportation ?? settings?.enableTransportation ?? false,
    enableAccessibility: localSettings.enableAccessibility ?? settings?.enableAccessibility ?? false,
    enableCategory: localSettings.enableCategory ?? settings?.enableCategory ?? false,
    requiredAddress: localSettings.requiredAddress ?? (settings as { requiredAddress?: boolean })?.requiredAddress ?? false,
    requiredMealChoice: localSettings.requiredMealChoice ?? (settings as { requiredMealChoice?: boolean })?.requiredMealChoice ?? false,
    requiredAccommodation: localSettings.requiredAccommodation ?? (settings as { requiredAccommodation?: boolean })?.requiredAccommodation ?? false,
    requiredPlusOneName: localSettings.requiredPlusOneName ?? (settings as { requiredPlusOneName?: boolean })?.requiredPlusOneName ?? false,
    requiredTableAssignment: localSettings.requiredTableAssignment ?? (settings as { requiredTableAssignment?: boolean })?.requiredTableAssignment ?? false,
    requiredTransportation: localSettings.requiredTransportation ?? (settings as { requiredTransportation?: boolean })?.requiredTransportation ?? false,
    requiredAccessibility: localSettings.requiredAccessibility ?? (settings as { requiredAccessibility?: boolean })?.requiredAccessibility ?? false,
    requiredCategory: localSettings.requiredCategory ?? (settings as { requiredCategory?: boolean })?.requiredCategory ?? false,
    requiredFirstName: localSettings.requiredFirstName ?? settings?.requiredFirstName ?? true,
    requiredLastName: localSettings.requiredLastName ?? settings?.requiredLastName ?? false,
    requiredEmail: localSettings.requiredEmail ?? settings?.requiredEmail ?? false,
    requiredPhone: localSettings.requiredPhone ?? settings?.requiredPhone ?? false,
    mealChoiceOptions: localSettings.mealChoiceOptions ?? settings?.mealChoiceOptions ?? [],
    categoryOptions: localSettings.categoryOptions ?? settings?.categoryOptions ?? null,
    accommodationCheckInDate: localSettings.accommodationCheckInDate ?? (settings as { accommodationCheckInDate?: string | null })?.accommodationCheckInDate ?? null,
    accommodationCheckOutDate: localSettings.accommodationCheckOutDate ?? (settings as { accommodationCheckOutDate?: string | null })?.accommodationCheckOutDate ?? null,
    accommodationHotels: localSettings.accommodationHotels ?? (settings as { accommodationHotels?: AccommodationHotel[] })?.accommodationHotels ?? null,
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
      await updateSettings.mutateAsync(localSettings as UpdateGuestSettingsInput);
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
        <CardHeader className="rounded-lg border border-border bg-muted/50">
          <CardTitle>Guest Field Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="rounded-lg border border-border bg-muted/50">
        <CardTitle>Guest Field Settings</CardTitle>
        <CardDescription>
          Configure which optional fields to collect for guests at this event.
          Changes will apply to new guests and when editing existing guests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
      <Separator />
      
        {/* Contact & Address */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Contact className="size-6 shrink-0 text-primary-600" aria-hidden />
            Contact Information
          </h3>
          <FieldToggle
            label="Address"
            description="Collect mailing address (street, city, state, zip, country)"
            checked={currentSettings.enableAddress}
            onCheckedChange={(checked) => handleChange('enableAddress', checked)}
            disabled={updateSettings.isPending}
            required={currentSettings.requiredAddress}
            onRequiredChange={(checked) => handleChange('requiredAddress', checked)}
            showRequired={currentSettings.enableAddress}
          />
        </div>

        <Separator />

        {/* Dietary & Seating */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <UtensilsCrossed className="size-6 shrink-0 text-amber-600" aria-hidden />
            Dietary & Seating
          </h3>
          
          <FieldToggle
            label="Meal Choice"
            description="Let guests select their meal preference"
            checked={currentSettings.enableMealChoice}
            onCheckedChange={(checked) => handleChange('enableMealChoice', checked)}
            disabled={updateSettings.isPending}
            required={currentSettings.requiredMealChoice}
            onRequiredChange={(checked) => handleChange('requiredMealChoice', checked)}
            showRequired={currentSettings.enableMealChoice}
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
            required={currentSettings.requiredTableAssignment}
            onRequiredChange={(checked) => handleChange('requiredTableAssignment', checked)}
            showRequired={currentSettings.enableTableAssignment}
          />
        </div>

        <Separator />

        {/* Logistics */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Hotel className="size-6 shrink-0 text-info-600" aria-hidden />
            Logistics
          </h3>

          <FieldToggle
            label="Accommodation"
            description="Track if guests need hotel accommodation"
            checked={currentSettings.enableAccommodation}
            onCheckedChange={(checked) => handleChange('enableAccommodation', checked)}
            disabled={updateSettings.isPending}
            required={currentSettings.requiredAccommodation}
            onRequiredChange={(checked) => handleChange('requiredAccommodation', checked)}
            showRequired={currentSettings.enableAccommodation}
          />

          {currentSettings.enableAccommodation && (
            <>
              <div className="grid grid-cols-2 gap-4 ml-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Check-in date (same for all hotels)</Label>
                  <Input
                    type="date"
                    value={currentSettings.accommodationCheckInDate ?? ''}
                    onChange={(e) => handleChange('accommodationCheckInDate', e.target.value || null)}
                    disabled={updateSettings.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Check-out date (same for all hotels)</Label>
                  <Input
                    type="date"
                    value={currentSettings.accommodationCheckOutDate ?? ''}
                    onChange={(e) => handleChange('accommodationCheckOutDate', e.target.value || null)}
                    disabled={updateSettings.isPending}
                  />
                </div>
              </div>
              <AccommodationHotelsEditor
                hotels={currentSettings.accommodationHotels ?? []}
                onChange={(hotels) => handleChange('accommodationHotels', hotels)}
                disabled={updateSettings.isPending}
              />
            </>
          )}

          <FieldToggle
            label="Transportation"
            description="Track if guests need transportation assistance"
            checked={currentSettings.enableTransportation}
            onCheckedChange={(checked) => handleChange('enableTransportation', checked)}
            disabled={updateSettings.isPending}
            required={currentSettings.requiredTransportation}
            onRequiredChange={(checked) => handleChange('requiredTransportation', checked)}
            showRequired={currentSettings.enableTransportation}
          />
        </div>

        <Separator />

        {/* Additional Info */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <FileText className="size-4 shrink-0 text-secondary-600" aria-hidden />
            Additional Information
          </h3>

          <FieldToggle
            label="Category"
            description="Categorize guests (e.g., VIP, Family, Friend). You can edit the option list below."
            checked={currentSettings.enableCategory}
            onCheckedChange={(checked) => {
              handleChange('enableCategory', checked);
              if (checked) {
                const opts = currentSettings.categoryOptions;
                if (!opts || opts.length === 0) {
                  handleChange('categoryOptions', DEFAULT_CATEGORY_OPTIONS);
                }
              }
            }}
            disabled={updateSettings.isPending}
            required={currentSettings.requiredCategory}
            onRequiredChange={(checked) => handleChange('requiredCategory', checked)}
            showRequired={currentSettings.enableCategory}
          />

          {currentSettings.enableCategory && (
            <MealChoiceEditor
              options={currentSettings.categoryOptions ?? []}
              onChange={(options) => handleChange('categoryOptions', options)}
              disabled={updateSettings.isPending}
            />
          )}

          <FieldToggle
            label="Plus-ones"
            description="Allow guests to bring plus-ones; set the default limit per guest below."
            checked={currentSettings.enablePlusOnes}
            onCheckedChange={(checked) => handleChange('enablePlusOnes', checked)}
            disabled={updateSettings.isPending}
          />
          {currentSettings.enablePlusOnes && (
            <div className="pl-4 border-l-2 border-muted space-y-3">
              <div className="space-y-2">
                <Label htmlFor="defaultPlusOnesAllowed">Default plus-ones allowed per guest</Label>
                <Input
                  id="defaultPlusOnesAllowed"
                  type="number"
                  min={0}
                  max={10}
                  value={currentSettings.defaultPlusOnesAllowed}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0));
                    handleChange('defaultPlusOnesAllowed', v);
                  }}
                  className="w-24"
                />
              </div>
              <FieldToggle
                label="Plus-One Name"
                description="Capture the name of the guest's plus-one"
                checked={currentSettings.enablePlusOneName}
                onCheckedChange={(checked) => handleChange('enablePlusOneName', checked)}
                disabled={updateSettings.isPending}
                required={currentSettings.requiredPlusOneName}
                onRequiredChange={(checked) => handleChange('requiredPlusOneName', checked)}
                showRequired={currentSettings.enablePlusOneName}
              />
            </div>
          )}

          <FieldToggle
            label="Accessibility Needs"
            description="Allow guests to specify accessibility requirements"
            checked={currentSettings.enableAccessibility}
            onCheckedChange={(checked) => handleChange('enableAccessibility', checked)}
            disabled={updateSettings.isPending}
            required={currentSettings.requiredAccessibility}
            onRequiredChange={(checked) => handleChange('requiredAccessibility', checked)}
            showRequired={currentSettings.enableAccessibility}
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
