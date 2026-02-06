/**
 * Custom Field Manager Component
 *
 * UI for creating, editing, and managing custom user-defined guest fields.
 * Part of Phase 3: Custom User-Defined Fields
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useGuestSettings,
  useUpdateGuestSettings,
  CUSTOM_FIELD_TYPES,
  type CustomFieldDefinition,
  type CustomFieldType,
} from '@/hooks/use-guests';

interface CustomFieldManagerProps {
  eventUuid: string;
}

interface FieldEditorProps {
  field: Partial<CustomFieldDefinition>;
  onChange: (field: Partial<CustomFieldDefinition>) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
  isSaving: boolean;
}

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  select: 'Single Select',
  multiselect: 'Multi Select',
  date: 'Date',
  checkbox: 'Checkbox',
};

function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function FieldEditor({ field, onChange, onSave, onCancel, isEditing, isSaving }: FieldEditorProps) {
  const [newOption, setNewOption] = useState('');

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    const options = field.options ?? [];
    if (options.includes(newOption.trim())) return;
    onChange({ ...field, options: [...options, newOption.trim()] });
    setNewOption('');
  };

  const handleRemoveOption = (option: string) => {
    onChange({ ...field, options: (field.options ?? []).filter((o) => o !== option) });
  };

  const needsOptions = field.type === 'select' || field.type === 'multiselect';

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{isEditing ? 'Edit Field' : 'New Custom Field'}</h4>
        <Button variant="ghost" size="sm" onClick={onCancel}>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="field-label">Field Label *</Label>
          <Input
            id="field-label"
            placeholder="e.g., Dietary Restrictions"
            value={field.label ?? ''}
            onChange={(e) => onChange({ ...field, label: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="field-type">Field Type *</Label>
          <Select
            value={field.type ?? ''}
            onValueChange={(value) => onChange({ ...field, type: value as CustomFieldType })}
          >
            <SelectTrigger id="field-type">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {CUSTOM_FIELD_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {FIELD_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="field-help">Help Text (optional)</Label>
        <Textarea
          id="field-help"
          placeholder="Instructions or examples for this field..."
          value={field.helpText ?? ''}
          onChange={(e) => onChange({ ...field, helpText: e.target.value })}
          rows={2}
        />
      </div>

      {/* Options for select/multiselect */}
      {needsOptions && (
        <div className="space-y-2">
          <Label>Options *</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(field.options ?? []).map((option) => (
              <Badge key={option} variant="secondary" className="gap-1">
                {option}
                <button
                  type="button"
                  onClick={() => handleRemoveOption(option)}
                  className="ml-1 hover:text-destructive"
                >
                  <svg
                    className="h-3 w-3"
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
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add option..."
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddOption();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddOption}
              disabled={!newOption.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="field-required"
            checked={field.required ?? false}
            onCheckedChange={(checked) => onChange({ ...field, required: checked })}
          />
          <Label htmlFor="field-required">Required field</Label>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={
              isSaving ||
              !field.label?.trim() ||
              !field.type ||
              (needsOptions && (!field.options || field.options.length === 0))
            }
          >
            {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Add Field'}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface FieldListItemProps {
  field: CustomFieldDefinition;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
}

function FieldListItem({
  field,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  disabled,
}: FieldListItemProps) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{field.label}</span>
          <Badge variant="outline" className="text-xs">
            {FIELD_TYPE_LABELS[field.type]}
          </Badge>
          {field.required && (
            <span className="ml-1 text-destructive">*</span>
          )}
        </div>
        {field.helpText && (
          <p className="text-sm text-muted-foreground truncate mt-1">
            {field.helpText}
          </p>
        )}
        {field.options && field.options.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {field.options.slice(0, 3).map((opt) => (
              <Badge key={opt} variant="secondary" className="text-xs">
                {opt}
              </Badge>
            ))}
            {field.options.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{field.options.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveUp}
          disabled={isFirst || disabled}
          className="h-8 w-8 p-0"
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
              d="M5 15l7-7 7 7"
            />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveDown}
          disabled={isLast || disabled}
          className="h-8 w-8 p-0"
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
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          className="text-destructive hover:text-destructive"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

export function CustomFieldManager({ eventUuid }: CustomFieldManagerProps) {
  const { data: settings, isLoading } = useGuestSettings(eventUuid);
  const updateSettings = useUpdateGuestSettings(eventUuid);

  const [editingField, setEditingField] = useState<Partial<CustomFieldDefinition> | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const customFields = settings?.customFieldDefinitions ?? [];

  const handleSaveField = useCallback(async () => {
    if (!editingField || !editingField.label || !editingField.type) return;

    const newField: CustomFieldDefinition = {
      id: editingField.id || generateFieldId(),
      label: editingField.label.trim(),
      type: editingField.type,
      required: editingField.required ?? false,
      helpText: editingField.helpText?.trim() || undefined,
      options: editingField.options,
    };

    let newFields: CustomFieldDefinition[];
    if (editingIndex !== null) {
      // Updating existing field
      newFields = customFields.map((f, i) => (i === editingIndex ? newField : f));
    } else {
      // Adding new field
      if (customFields.length >= 10) {
        // Max 10 custom fields
        return;
      }
      newFields = [...customFields, newField];
    }

    await updateSettings.mutateAsync({ customFieldDefinitions: newFields });
    setEditingField(null);
    setEditingIndex(null);
  }, [editingField, editingIndex, customFields, updateSettings]);

  const handleDeleteField = useCallback(async (index: number) => {
    const newFields = customFields.filter((_, i) => i !== index);
    await updateSettings.mutateAsync({ customFieldDefinitions: newFields });
  }, [customFields, updateSettings]);

  const handleMoveField = useCallback(async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= customFields.length) return;

    const newFields = [...customFields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    await updateSettings.mutateAsync({ customFieldDefinitions: newFields });
  }, [customFields, updateSettings]);

  const handleStartEdit = (field: CustomFieldDefinition, index: number) => {
    setEditingField({ ...field });
    setEditingIndex(index);
  };

  const handleStartAdd = () => {
    setEditingField({ required: false });
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditingIndex(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Fields</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Fields</CardTitle>
        <CardDescription>
          Create your own fields to collect additional information from guests.
          You can add up to 10 custom fields.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Field Editor */}
        {editingField !== null && (
          <FieldEditor
            field={editingField}
            onChange={setEditingField}
            onSave={handleSaveField}
            onCancel={handleCancelEdit}
            isEditing={editingIndex !== null}
            isSaving={updateSettings.isPending}
          />
        )}

        {/* Existing Fields List */}
        {customFields.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Existing Fields ({customFields.length}/10)
            </h4>
            <div className="space-y-2">
              {customFields.map((field, index) => (
                <FieldListItem
                  key={field.id}
                  field={field}
                  onEdit={() => handleStartEdit(field, index)}
                  onDelete={() => handleDeleteField(index)}
                  onMoveUp={() => handleMoveField(index, 'up')}
                  onMoveDown={() => handleMoveField(index, 'down')}
                  isFirst={index === 0}
                  isLast={index === customFields.length - 1}
                  disabled={updateSettings.isPending || editingField !== null}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {customFields.length === 0 && editingField === null && (
          <div className="text-center py-8 text-muted-foreground">
            <svg
              className="h-12 w-12 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm">No custom fields yet</p>
            <p className="text-xs mt-1">
              Add custom fields to collect additional information from your guests.
            </p>
          </div>
        )}

        {/* Add Button */}
        {editingField === null && customFields.length < 10 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleStartAdd}
          >
            <svg
              className="h-4 w-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Custom Field
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface CustomFieldManagerDialogProps {
  eventUuid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomFieldManagerDialog({
  eventUuid,
  open,
  onOpenChange,
}: CustomFieldManagerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custom Guest Fields</DialogTitle>
          <DialogDescription>
            Create custom fields to collect additional information from your guests.
          </DialogDescription>
        </DialogHeader>
        <CustomFieldManager eventUuid={eventUuid} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomFieldManager;
