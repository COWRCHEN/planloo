import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { FloorPlanObjectResponse } from '@/hooks/use-floor-plans';
import type { UpdateObjectInput } from '@/hooks/use-floor-plan-objects';

interface Props {
  object: FloorPlanObjectResponse;
  onUpdate: (data: UpdateObjectInput) => void;
  onDelete: () => void;
  onClose?: () => void;
  isUpdating?: boolean;
}

const SIDED_SHAPES = ['rectangular', 'head_table', 'square'];

export function ObjectPropertyPanel({ object, onUpdate, onDelete, onClose, isUpdating }: Props) {
  const [label, setLabel] = useState(object.label);
  const [seatCount, setSeatCount] = useState(object.seatCount ?? 8);
  const [widthFt, setWidthFt] = useState(object.widthFt);
  const [heightFt, setHeightFt] = useState(object.heightFt);
  const [rotation, setRotation] = useState(object.rotation);
  const [seatTop, setSeatTop] = useState(object.seatTop ?? 0);
  const [seatBottom, setSeatBottom] = useState(object.seatBottom ?? 0);
  const [seatLeft, setSeatLeft] = useState(object.seatLeft ?? 0);
  const [seatRight, setSeatRight] = useState(object.seatRight ?? 0);

  const isSided = object.objectType === 'table' && SIDED_SHAPES.includes(object.tableShape ?? '');
  const hasSideValues = object.seatTop !== null;

  useEffect(() => {
    setLabel(object.label);
    setSeatCount(object.seatCount ?? 8);
    setWidthFt(object.widthFt);
    setHeightFt(object.heightFt);
    setRotation(object.rotation);
    setSeatTop(object.seatTop ?? 0);
    setSeatBottom(object.seatBottom ?? 0);
    setSeatLeft(object.seatLeft ?? 0);
    setSeatRight(object.seatRight ?? 0);
  }, [object.uuid]);

  const handleSave = () => {
    const updates: UpdateObjectInput = {};
    if (label !== object.label) updates.label = label;
    if (widthFt !== object.widthFt) updates.widthFt = widthFt;
    if (heightFt !== object.heightFt) updates.heightFt = heightFt;
    if (rotation !== object.rotation) updates.rotation = rotation;

    if (object.objectType === 'table') {
      if (isSided && hasSideValues) {
        const totalSeats = seatTop + seatBottom + seatLeft + seatRight;
        if (totalSeats !== object.seatCount) updates.seatCount = totalSeats;
        if (seatTop !== (object.seatTop ?? 0)) updates.seatTop = seatTop;
        if (seatBottom !== (object.seatBottom ?? 0)) updates.seatBottom = seatBottom;
        if (seatLeft !== (object.seatLeft ?? 0)) updates.seatLeft = seatLeft;
        if (seatRight !== (object.seatRight ?? 0)) updates.seatRight = seatRight;
      } else if (seatCount !== object.seatCount) {
        updates.seatCount = seatCount;
      }
    }

    if (Object.keys(updates).length > 0) onUpdate(updates);
  };

  return (
    <div className="w-60 h-full border-l bg-white p-3 overflow-y-auto space-y-4 shadow-lg">
      <div className="flex items-center justify-between">
        {onClose && (
          <button onClick={onClose} className="text-xs text-primary hover:underline">
            Hide
          </button>
        )}
        <h3 className="text-sm font-semibold">Properties</h3>
        <span className="text-xs text-muted-foreground capitalize">{object.objectType}</span>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Label</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleSave}
            className="h-8 text-sm"
          />
        </div>

        {object.objectType === 'table' && isSided && hasSideValues ? (
          <div className="space-y-1.5">
            <Label className="text-xs">Seats per side</Label>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <Label className="text-[10px] text-muted-foreground">Top</Label>
                <Input type="number" min={0} max={50} value={seatTop} onChange={(e) => setSeatTop(parseInt(e.target.value) || 0)} onBlur={handleSave} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Bottom</Label>
                <Input type="number" min={0} max={50} value={seatBottom} onChange={(e) => setSeatBottom(parseInt(e.target.value) || 0)} onBlur={handleSave} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Left</Label>
                <Input type="number" min={0} max={50} value={seatLeft} onChange={(e) => setSeatLeft(parseInt(e.target.value) || 0)} onBlur={handleSave} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Right</Label>
                <Input type="number" min={0} max={50} value={seatRight} onChange={(e) => setSeatRight(parseInt(e.target.value) || 0)} onBlur={handleSave} className="h-7 text-xs" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Total: {seatTop + seatBottom + seatLeft + seatRight} seats</p>
          </div>
        ) : object.objectType === 'table' ? (
          <div>
            <Label className="text-xs">Seats</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={seatCount}
              onChange={(e) => setSeatCount(parseInt(e.target.value) || 1)}
              onBlur={handleSave}
              className="h-8 text-sm"
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Width (ft)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              step={0.5}
              value={widthFt}
              onChange={(e) => setWidthFt(parseFloat(e.target.value) || 1)}
              onBlur={handleSave}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Height (ft)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              step={0.5}
              value={heightFt}
              onChange={(e) => setHeightFt(parseFloat(e.target.value) || 1)}
              onBlur={handleSave}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Rotation ({rotation}°)</Label>
          <input
            type="range"
            min={0}
            max={359}
            value={rotation}
            onChange={(e) => setRotation(parseInt(e.target.value))}
            onMouseUp={handleSave}
            className="w-full"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Locked</Label>
          <Switch
            checked={object.isLocked}
            onCheckedChange={(checked) => onUpdate({ isLocked: checked })}
          />
        </div>

        {object.objectType === 'table' && object.tableNumber && (
          <div className="text-xs text-muted-foreground">
            Table #{object.tableNumber}
          </div>
        )}
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={onDelete}
        disabled={isUpdating}
        className="w-full"
      >
        Delete {object.objectType === 'table' ? 'Table' : 'Element'}
      </Button>
    </div>
  );
}
