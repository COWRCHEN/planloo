/**
 * Custom Fields Component
 *
 * Dynamically renders custom user-defined fields based on field definitions.
 * Supports field types: text, number, select, multiselect, date, checkbox
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CustomFieldDefinition } from '@/hooks/use-guests';

interface CustomFieldsProps {
  definitions: CustomFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  /** Per-field validation errors (keyed by field id) */
  errors?: Record<string, { message?: string } | undefined>;
  disabled?: boolean;
}

export function CustomFields({ definitions, values, onChange, errors, disabled }: CustomFieldsProps) {
  const handleChange = (fieldId: string, value: unknown) => {
    onChange({
      ...values,
      [fieldId]: value,
    });
  };

  if (!definitions || definitions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {definitions.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="ml-1 text-destructive">*</span>}
            </Label>

            {/* Text field */}
            {field.type === 'text' && (
              <>
                {(field.helpText?.length ?? 0) > 50 ? (
                  <Textarea
                    id={field.id}
                    value={(values[field.id] as string) ?? ''}
                    onChange={(e) => handleChange(field.id, e.target.value || null)}
                    placeholder={field.helpText || `Enter ${field.label.toLowerCase()}...`}
                    disabled={disabled}
                    rows={2}
                  />
                ) : (
                  <Input
                    id={field.id}
                    type="text"
                    value={(values[field.id] as string) ?? ''}
                    onChange={(e) => handleChange(field.id, e.target.value || null)}
                    placeholder={field.helpText || `Enter ${field.label.toLowerCase()}...`}
                    disabled={disabled}
                  />
                )}
              </>
            )}

            {/* Number field */}
            {field.type === 'number' && (
              <Input
                id={field.id}
                type="number"
                value={(values[field.id] as number) ?? ''}
                onChange={(e) => handleChange(field.id, e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={field.helpText || `Enter ${field.label.toLowerCase()}...`}
                disabled={disabled}
              />
            )}

            {/* Select field */}
            {field.type === 'select' && field.options && (
              <Select
                value={(values[field.id] as string) ?? ''}
                onValueChange={(value) => handleChange(field.id, value || null)}
                disabled={disabled}
              >
                <SelectTrigger id={field.id}>
                  <SelectValue placeholder={field.helpText || `Select ${field.label.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Multiselect field - simplified as checkboxes */}
            {field.type === 'multiselect' && field.options && (
              <div className="space-y-2 rounded-lg border p-3">
                {field.options.map((option) => {
                  const selectedValues = (values[field.id] as string[]) ?? [];
                  const isChecked = selectedValues.includes(option);

                  return (
                    <div key={option} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`${field.id}-${option}`}
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleChange(field.id, [...selectedValues, option]);
                          } else {
                            handleChange(field.id, selectedValues.filter((v) => v !== option));
                          }
                        }}
                        disabled={disabled}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor={`${field.id}-${option}`} className="font-normal">
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Date field */}
            {field.type === 'date' && (
              <Input
                id={field.id}
                type="date"
                value={(values[field.id] as string) ?? ''}
                onChange={(e) => handleChange(field.id, e.target.value || null)}
                disabled={disabled}
              />
            )}

            {/* Checkbox field */}
            {field.type === 'checkbox' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={field.id}
                  checked={(values[field.id] as boolean) ?? false}
                  onChange={(e) => handleChange(field.id, e.target.checked)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {field.helpText && (
                  <span className="text-sm text-muted-foreground">{field.helpText}</span>
                )}
              </div>
            )}

            {/* Help text for non-checkbox fields */}
            {field.helpText && field.type !== 'checkbox' && field.type !== 'text' && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}

            {errors?.[field.id]?.message && (
              <p className="text-sm text-destructive">{errors[field.id].message}</p>
            )}
          </div>
        ))}
    </div>
  );
}

export default CustomFields;
