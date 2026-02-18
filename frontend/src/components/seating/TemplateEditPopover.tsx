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

const SIDED_SHAPES = ['rectangular', 'head_table', 'square'];

export function TemplateEditPopover({ template, onUpdate, onDelete, isUpdating, children }: Props) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(template.label);
  const [widthFt, setWidthFt] = useState(String(template.widthFt));
  const [heightFt, setHeightFt] = useState(String(template.heightFt));
  const [seatCount, setSeatCount] = useState(String(template.seatCount ?? ''));
  const [seatTop, setSeatTop] = useState(String(template.seatTop ?? 0));
  const [seatBottom, setSeatBottom] = useState(String(template.seatBottom ?? 0));
  const [seatLeft, setSeatLeft] = useState(String(template.seatLeft ?? 0));
  const [seatRight, setSeatRight] = useState(String(template.seatRight ?? 0));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasSides = template.objectType === 'table' && SIDED_SHAPES.includes(template.tableShape ?? '');

  const handleSave = () => {
    const data: UpdateTemplateInput = {};
    if (label !== template.label) data.label = label;
    if (Number(widthFt) !== template.widthFt) data.widthFt = Number(widthFt);
    if (Number(heightFt) !== template.heightFt) data.heightFt = Number(heightFt);
    if (template.objectType === 'table') {
      if (hasSides) {
        const t = Number(seatTop) || 0;
        const b = Number(seatBottom) || 0;
        const l = Number(seatLeft) || 0;
        const r = Number(seatRight) || 0;
        data.seatTop = t;
        data.seatBottom = b;
        data.seatLeft = l;
        data.seatRight = r;
        data.seatCount = t + b + l + r;
      } else if (Number(seatCount) !== template.seatCount) {
        data.seatCount = Number(seatCount);
      }
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
      setLabel(template.label);
      setWidthFt(String(template.widthFt));
      setHeightFt(String(template.heightFt));
      setSeatCount(String(template.seatCount ?? ''));
      setSeatTop(String(template.seatTop ?? 0));
      setSeatBottom(String(template.seatBottom ?? 0));
      setSeatLeft(String(template.seatLeft ?? 0));
      setSeatRight(String(template.seatRight ?? 0));
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
                max={1000}
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
                max={1000}
              />
            </div>
          </div>
          {template.objectType === 'table' && (
            hasSides ? (
              <div>
                <Label className="text-xs">Seats per side</Label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <div>
                    <Label htmlFor={`st-${template.uuid}`} className="text-[10px] text-muted-foreground">Top</Label>
                    <Input id={`st-${template.uuid}`} type="number" value={seatTop} onChange={(e) => setSeatTop(e.target.value)} className="h-6 text-xs" min={0} max={50} />
                  </div>
                  <div>
                    <Label htmlFor={`sb-${template.uuid}`} className="text-[10px] text-muted-foreground">Bottom</Label>
                    <Input id={`sb-${template.uuid}`} type="number" value={seatBottom} onChange={(e) => setSeatBottom(e.target.value)} className="h-6 text-xs" min={0} max={50} />
                  </div>
                  <div>
                    <Label htmlFor={`sl-${template.uuid}`} className="text-[10px] text-muted-foreground">Left</Label>
                    <Input id={`sl-${template.uuid}`} type="number" value={seatLeft} onChange={(e) => setSeatLeft(e.target.value)} className="h-6 text-xs" min={0} max={50} />
                  </div>
                  <div>
                    <Label htmlFor={`sr-${template.uuid}`} className="text-[10px] text-muted-foreground">Right</Label>
                    <Input id={`sr-${template.uuid}`} type="number" value={seatRight} onChange={(e) => setSeatRight(e.target.value)} className="h-6 text-xs" min={0} max={50} />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Total: {(Number(seatTop) || 0) + (Number(seatBottom) || 0) + (Number(seatLeft) || 0) + (Number(seatRight) || 0)} seats
                </p>
              </div>
            ) : (
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
            )
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
