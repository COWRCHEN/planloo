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
  isUpdating?: boolean;
}

export function ObjectPropertyPanel({ object, onUpdate, onDelete, isUpdating }: Props) {
  const [label, setLabel] = useState(object.label);
  const [seatCount, setSeatCount] = useState(object.seatCount ?? 8);
  const [widthFt, setWidthFt] = useState(object.widthFt);
  const [heightFt, setHeightFt] = useState(object.heightFt);
  const [rotation, setRotation] = useState(object.rotation);

  useEffect(() => {
    setLabel(object.label);
    setSeatCount(object.seatCount ?? 8);
    setWidthFt(object.widthFt);
    setHeightFt(object.heightFt);
    setRotation(object.rotation);
  }, [object.uuid]);

  const handleSave = () => {
    const updates: UpdateObjectInput = {};
    if (label !== object.label) updates.label = label;
    if (object.objectType === 'table' && seatCount !== object.seatCount) updates.seatCount = seatCount;
    if (widthFt !== object.widthFt) updates.widthFt = widthFt;
    if (heightFt !== object.heightFt) updates.heightFt = heightFt;
    if (rotation !== object.rotation) updates.rotation = rotation;
    if (Object.keys(updates).length > 0) onUpdate(updates);
  };

  return (
    <div className="w-60 border-l bg-white p-3 overflow-y-auto space-y-4">
      <div className="flex items-center justify-between">
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

        {object.objectType === 'table' && (
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
        )}

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
