/**
 * Wedding Guest Fields Component
 *
 * Renders wedding-specific fields for guest forms:
 * - Guest side (bride/groom/both)
 * - Invited to (ceremony/reception/both)
 * - Gift tracking with thank-you card status
 */

import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WeddingGuestDetails, WeddingGuestSide, WeddingInvitedTo } from '@/hooks/use-guests';

const WEDDING_SIDES: { value: WeddingGuestSide; label: string }[] = [
  { value: 'bride', label: "Bride's Side" },
  { value: 'groom', label: "Groom's Side" },
  { value: 'both', label: 'Both Sides' },
];

const INVITED_TO_OPTIONS: { value: WeddingInvitedTo; label: string }[] = [
  { value: 'ceremony', label: 'Ceremony Only' },
  { value: 'reception', label: 'Reception Only' },
  { value: 'both', label: 'Ceremony & Reception' },
];

interface WeddingFieldsProps {
  values?: Partial<WeddingGuestDetails> | null;
  onChange?: (values: Partial<WeddingGuestDetails>) => void;
  disabled?: boolean;
}

export function WeddingFields({ values, onChange, disabled }: WeddingFieldsProps) {
  const handleChange = (field: keyof WeddingGuestDetails, value: unknown) => {
    onChange?.({
      ...values,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">Wedding Details</h4>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Guest Side */}
        <div className="space-y-2">
          <Label htmlFor="guestSide">Guest Side</Label>
          <Select
            value={values?.guestSide ?? ''}
            onValueChange={(value) => handleChange('guestSide', value || null)}
            disabled={disabled}
          >
            <SelectTrigger id="guestSide">
              <SelectValue placeholder="Select side..." />
            </SelectTrigger>
            <SelectContent>
              {WEDDING_SIDES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Invited To */}
        <div className="space-y-2">
          <Label htmlFor="invitedTo">Invited To</Label>
          <Select
            value={values?.invitedTo ?? 'both'}
            onValueChange={(value) => handleChange('invitedTo', value || 'both')}
            disabled={disabled}
          >
            <SelectTrigger id="invitedTo">
              <SelectValue placeholder="Select events..." />
            </SelectTrigger>
            <SelectContent>
              {INVITED_TO_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Gift Tracking */}
      <div className="space-y-4 rounded-lg border p-4">
        <h5 className="text-sm font-medium">Gift Tracking</h5>

        <div className="space-y-4">
          {/* Wedding Gift */}
          <div className="space-y-2">
            <Label htmlFor="weddingGiftDescription">Wedding Gift</Label>
            <Textarea
              id="weddingGiftDescription"
              placeholder="Describe the gift received..."
              value={values?.weddingGiftDescription ?? ''}
              onChange={(e) => handleChange('weddingGiftDescription', e.target.value || null)}
              disabled={disabled}
              rows={2}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="weddingGiftThankYouSent"
                checked={values?.weddingGiftThankYouSent ?? false}
                onChange={(e) => handleChange('weddingGiftThankYouSent', e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="weddingGiftThankYouSent" className="text-sm font-normal">
                Thank you card sent
              </Label>
            </div>
          </div>

          {/* Shower Gift */}
          <div className="space-y-2">
            <Label htmlFor="showerGiftDescription">Shower Gift</Label>
            <Textarea
              id="showerGiftDescription"
              placeholder="Describe the shower gift received..."
              value={values?.showerGiftDescription ?? ''}
              onChange={(e) => handleChange('showerGiftDescription', e.target.value || null)}
              disabled={disabled}
              rows={2}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showerGiftThankYouSent"
                checked={values?.showerGiftThankYouSent ?? false}
                onChange={(e) => handleChange('showerGiftThankYouSent', e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="showerGiftThankYouSent" className="text-sm font-normal">
                Thank you card sent
              </Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Wedding Fields for react-hook-form integration
 */
export function WeddingFieldsRHF({ disabled }: { disabled?: boolean }) {
  const { watch, setValue } = useFormContext();
  const weddingDetails = watch('weddingDetails') || {};

  return (
    <WeddingFields
      values={weddingDetails}
      onChange={(values) => setValue('weddingDetails', values, { shouldDirty: true })}
      disabled={disabled}
    />
  );
}

export default WeddingFields;
