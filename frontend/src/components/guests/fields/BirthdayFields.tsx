/**
 * Birthday Guest Fields Component
 *
 * Renders birthday party-specific fields for guest forms:
 * - Relationship to birthday person
 * - Age group (for activity planning)
 * - Gift contribution (for group gifts)
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
import type { BirthdayGuestDetails, AgeGroup } from '@/hooks/use-guests';

const AGE_GROUPS: { value: AgeGroup; label: string; description: string }[] = [
  { value: 'child', label: 'Child', description: '0-12 years' },
  { value: 'teen', label: 'Teen', description: '13-17 years' },
  { value: 'adult', label: 'Adult', description: '18+ years' },
];

interface BirthdayFieldsProps {
  values?: Partial<BirthdayGuestDetails> | null;
  onChange?: (values: Partial<BirthdayGuestDetails>) => void;
  disabled?: boolean;
}

export function BirthdayFields({ values, onChange, disabled }: BirthdayFieldsProps) {
  const handleChange = (field: keyof BirthdayGuestDetails, value: unknown) => {
    onChange?.({
      ...values,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">Birthday Party Details</h4>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Relationship to Birthday Person */}
        <div className="space-y-2">
          <Label htmlFor="relationshipToBirthdayPerson">Relationship</Label>
          <Input
            id="relationshipToBirthdayPerson"
            placeholder="e.g., Friend, Cousin, Coworker..."
            value={values?.relationshipToBirthdayPerson ?? ''}
            onChange={(e) => handleChange('relationshipToBirthdayPerson', e.target.value || null)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            How is this guest related to the birthday person?
          </p>
        </div>

        {/* Age Group */}
        <div className="space-y-2">
          <Label htmlFor="ageGroup">Age Group</Label>
          <Select
            value={values?.ageGroup ?? ''}
            onValueChange={(value) => handleChange('ageGroup', value || null)}
            disabled={disabled}
          >
            <SelectTrigger id="ageGroup">
              <SelectValue placeholder="Select age group..." />
            </SelectTrigger>
            <SelectContent>
              {AGE_GROUPS.map((option) => (
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
          <p className="text-xs text-muted-foreground">
            Helpful for planning age-appropriate activities
          </p>
        </div>
      </div>

      {/* Gift Contribution */}
      <div className="space-y-2 rounded-lg border p-4">
        <Label htmlFor="giftContribution">Gift Contribution</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">$</span>
          <Input
            id="giftContribution"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={values?.giftContribution ?? ''}
            onChange={(e) => {
              const value = e.target.value ? parseFloat(e.target.value) : null;
              handleChange('giftContribution', value);
            }}
            disabled={disabled}
            className="max-w-32"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Track contributions for group gifts
        </p>
      </div>
    </div>
  );
}

/**
 * Birthday Fields for react-hook-form integration
 */
export function BirthdayFieldsRHF({ disabled }: { disabled?: boolean }) {
  const { watch, setValue } = useFormContext();
  const birthdayDetails = watch('birthdayDetails') || {};

  return (
    <BirthdayFields
      values={birthdayDetails}
      onChange={(values) => setValue('birthdayDetails', values, { shouldDirty: true })}
      disabled={disabled}
    />
  );
}

export default BirthdayFields;
