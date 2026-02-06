/**
 * Corporate Guest Fields Component
 *
 * Renders corporate event-specific fields for guest forms:
 * - Company name
 * - Job title
 * - Department
 * - Attendee type
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
import type { CorporateGuestDetails, AttendeeType } from '@/hooks/use-guests';

const ATTENDEE_TYPES: { value: AttendeeType; label: string }[] = [
  { value: 'employee', label: 'Employee' },
  { value: 'client', label: 'Client' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'partner', label: 'Partner' },
  { value: 'other', label: 'Other' },
];

interface CorporateFieldsProps {
  values?: Partial<CorporateGuestDetails> | null;
  onChange?: (values: Partial<CorporateGuestDetails>) => void;
  disabled?: boolean;
}

export function CorporateFields({ values, onChange, disabled }: CorporateFieldsProps) {
  const handleChange = (field: keyof CorporateGuestDetails, value: unknown) => {
    onChange?.({
      ...values,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">Corporate Details</h4>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="companyName">Company</Label>
          <Input
            id="companyName"
            placeholder="Enter company name..."
            value={values?.companyName ?? ''}
            onChange={(e) => handleChange('companyName', e.target.value || null)}
            disabled={disabled}
          />
        </div>

        {/* Job Title */}
        <div className="space-y-2">
          <Label htmlFor="jobTitle">Job Title</Label>
          <Input
            id="jobTitle"
            placeholder="Enter job title..."
            value={values?.jobTitle ?? ''}
            onChange={(e) => handleChange('jobTitle', e.target.value || null)}
            disabled={disabled}
          />
        </div>

        {/* Department */}
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            placeholder="Enter department..."
            value={values?.department ?? ''}
            onChange={(e) => handleChange('department', e.target.value || null)}
            disabled={disabled}
          />
        </div>

        {/* Attendee Type */}
        <div className="space-y-2">
          <Label htmlFor="attendeeType">Attendee Type</Label>
          <Select
            value={values?.attendeeType ?? ''}
            onValueChange={(value) => handleChange('attendeeType', value || null)}
            disabled={disabled}
          >
            <SelectTrigger id="attendeeType">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {ATTENDEE_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

/**
 * Corporate Fields for react-hook-form integration
 */
export function CorporateFieldsRHF({ disabled }: { disabled?: boolean }) {
  const { watch, setValue } = useFormContext();
  const corporateDetails = watch('corporateDetails') || {};

  return (
    <CorporateFields
      values={corporateDetails}
      onChange={(values) => setValue('corporateDetails', values, { shouldDirty: true })}
      disabled={disabled}
    />
  );
}

export default CorporateFields;
