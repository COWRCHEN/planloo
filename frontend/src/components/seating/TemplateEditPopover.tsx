import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ObjectTemplate, UpdateTemplateInput } from '@/hooks/use-object-templates';

interface Props {
  template: ObjectTemplate;
  onUpdate: (templateUuid: string, data: UpdateTemplateInput) => void;
  onDelete: (templateUuid: string) => void;
  isUpdating?: boolean;
  children: React.ReactNode;
}

export function TemplateEditPopover({ template, onUpdate, onDelete, isUpdating, children }: Props) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(template.label);
  const [widthFt, setWidthFt] = useState(String(template.widthFt));
  const [heightFt, setHeightFt] = useState(String(template.heightFt));
  const [seatCount, setSeatCount] = useState(String(template.seatCount ?? ''));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    const data: UpdateTemplateInput = {};
    if (label !== template.label) data.label = label;
    if (Number(widthFt) !== template.widthFt) data.widthFt = Number(widthFt);
    if (Number(heightFt) !== template.heightFt) data.heightFt = Number(heightFt);
    if (template.objectType === 'table' && Number(seatCount) !== template.seatCount) {
      data.seatCount = Number(seatCount);
    }
    if (Object.keys(data).length > 0) {
      onUpdate(template.uuid, data);
    }
    setOpen(false);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(template.uuid);
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset form state when opening
      setLabel(template.label);
      setWidthFt(String(template.widthFt));
      setHeightFt(String(template.heightFt));
      setSeatCount(String(template.seatCount ?? ''));
      setConfirmDelete(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-56 p-3">
        <div className="space-y-2.5">
          <div>
            <Label htmlFor={`label-${template.uuid}`} className="text-xs">Label</Label>
            <Input
              id={`label-${template.uuid}`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-7 text-xs mt-1"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor={`w-${template.uuid}`} className="text-xs">Width (ft)</Label>
              <Input
                id={`w-${template.uuid}`}
                type="number"
                value={widthFt}
                onChange={(e) => setWidthFt(e.target.value)}
                className="h-7 text-xs mt-1"
                min={1}
                max={100}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor={`h-${template.uuid}`} className="text-xs">Height (ft)</Label>
              <Input
                id={`h-${template.uuid}`}
                type="number"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                className="h-7 text-xs mt-1"
                min={1}
                max={100}
              />
            </div>
          </div>
          {template.objectType === 'table' && (
            <div>
              <Label htmlFor={`seats-${template.uuid}`} className="text-xs">Seats</Label>
              <Input
                id={`seats-${template.uuid}`}
                type="number"
                value={seatCount}
                onChange={(e) => setSeatCount(e.target.value)}
                className="h-7 text-xs mt-1"
                min={1}
                max={50}
              />
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={handleDelete}
            >
              {confirmDelete ? 'Confirm?' : 'Delete'}
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSave}
              disabled={isUpdating || !label.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
