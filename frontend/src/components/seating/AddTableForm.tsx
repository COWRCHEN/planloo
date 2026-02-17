import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CreateObjectInput } from '@/hooks/use-floor-plan-objects';

interface Props {
  onAdd: (input: CreateObjectInput) => void;
  tableCount: number;
  isAdding?: boolean;
}

const SHAPE_DEFAULTS: Record<string, { seatCount: number; widthFt?: number; heightFt?: number }> = {
  round: { seatCount: 8 },
  rectangular: { seatCount: 8, widthFt: 10, heightFt: 4 },
  square: { seatCount: 4, widthFt: 4, heightFt: 4 },
  head_table: { seatCount: 12, widthFt: 16, heightFt: 3 },
};

const SHAPE_OPTIONS = [
  { value: 'round', label: 'Round' },
  { value: 'rectangular', label: 'Rectangular' },
  { value: 'square', label: 'Square' },
  { value: 'head_table', label: 'Head Table' },
];

export function AddTableForm({ onAdd, tableCount, isAdding }: Props) {
  const [shape, setShape] = useState('round');
  const [seatCount, setSeatCount] = useState(8);
  const [label, setLabel] = useState('');

  const handleShapeChange = (value: string) => {
    setShape(value);
    setSeatCount(SHAPE_DEFAULTS[value]?.seatCount ?? 8);
  };

  const handleAdd = () => {
    const defaults = SHAPE_DEFAULTS[shape];
    onAdd({
      objectType: 'table',
      tableShape: shape,
      label: label.trim() || `Table ${tableCount + 1}`,
      seatCount,
      widthFt: defaults?.widthFt,
      heightFt: defaults?.heightFt,
    });
    setLabel('');
  };

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Shape</label>
        <Select value={shape} onValueChange={handleShapeChange}>
          <SelectTrigger className="h-8 text-xs w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHAPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Seats</label>
        <Input
          type="number"
          min={1}
          max={50}
          value={seatCount}
          onChange={(e) => setSeatCount(Number(e.target.value) || 1)}
          className="h-8 text-xs w-[70px]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Name</label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={`Table ${tableCount + 1}`}
          className="h-8 text-xs w-[140px]"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
      </div>
      <Button size="sm" onClick={handleAdd} disabled={isAdding} className="h-8 text-xs">
        {isAdding ? 'Adding...' : 'Add Table'}
      </Button>
    </div>
  );
}
