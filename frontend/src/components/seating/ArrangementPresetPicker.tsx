import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { CreateObjectInput } from '@/hooks/use-floor-plan-objects';

interface Props {
  onApplyPreset: (objects: CreateObjectInput[]) => void;
}

interface Preset {
  name: string;
  description: string;
  objects: CreateObjectInput[];
}

const PRESETS: Preset[] = [
  {
    name: 'Round Tables (6)',
    description: '6 round tables with 8 seats each, arranged in a grid',
    objects: [
      { objectType: 'table', tableShape: 'round', label: 'Table 1', seatCount: 8, posX: 15, posY: 15 },
      { objectType: 'table', tableShape: 'round', label: 'Table 2', seatCount: 8, posX: 40, posY: 15 },
      { objectType: 'table', tableShape: 'round', label: 'Table 3', seatCount: 8, posX: 65, posY: 15 },
      { objectType: 'table', tableShape: 'round', label: 'Table 4', seatCount: 8, posX: 15, posY: 45 },
      { objectType: 'table', tableShape: 'round', label: 'Table 5', seatCount: 8, posX: 40, posY: 45 },
      { objectType: 'table', tableShape: 'round', label: 'Table 6', seatCount: 8, posX: 65, posY: 45 },
    ],
  },
  {
    name: 'Banquet Style',
    description: 'Head table with 4 round guest tables',
    objects: [
      { objectType: 'table', tableShape: 'head_table', label: 'Head Table', seatCount: 12, posX: 25, posY: 5, widthFt: 16, heightFt: 3 },
      { objectType: 'table', tableShape: 'round', label: 'Table 1', seatCount: 8, posX: 10, posY: 30 },
      { objectType: 'table', tableShape: 'round', label: 'Table 2', seatCount: 8, posX: 40, posY: 30 },
      { objectType: 'table', tableShape: 'round', label: 'Table 3', seatCount: 8, posX: 10, posY: 55 },
      { objectType: 'table', tableShape: 'round', label: 'Table 4', seatCount: 8, posX: 40, posY: 55 },
    ],
  },
  {
    name: 'Conference U-Shape',
    description: 'U-shaped table arrangement for meetings',
    objects: [
      { objectType: 'table', tableShape: 'rectangular', label: 'Left', seatCount: 6, posX: 15, posY: 15, widthFt: 4, heightFt: 20 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Center', seatCount: 6, posX: 19, posY: 35, widthFt: 30, heightFt: 4 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Right', seatCount: 6, posX: 45, posY: 15, widthFt: 4, heightFt: 20 },
    ],
  },
  {
    name: 'Classroom Style',
    description: 'Rows of rectangular tables facing front',
    objects: [
      { objectType: 'table', tableShape: 'rectangular', label: 'Row 1 Left', seatCount: 4, posX: 10, posY: 20, widthFt: 10, heightFt: 3 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Row 1 Right', seatCount: 4, posX: 30, posY: 20, widthFt: 10, heightFt: 3 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Row 2 Left', seatCount: 4, posX: 10, posY: 35, widthFt: 10, heightFt: 3 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Row 2 Right', seatCount: 4, posX: 30, posY: 35, widthFt: 10, heightFt: 3 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Row 3 Left', seatCount: 4, posX: 10, posY: 50, widthFt: 10, heightFt: 3 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Row 3 Right', seatCount: 4, posX: 30, posY: 50, widthFt: 10, heightFt: 3 },
    ],
  },
  {
    name: 'Workshop Groups',
    description: 'Small group tables for collaborative work',
    objects: [
      { objectType: 'table', tableShape: 'round', label: 'Group 1', seatCount: 5, posX: 12, posY: 12, widthFt: 5, heightFt: 5 },
      { objectType: 'table', tableShape: 'round', label: 'Group 2', seatCount: 5, posX: 38, posY: 12, widthFt: 5, heightFt: 5 },
      { objectType: 'table', tableShape: 'round', label: 'Group 3', seatCount: 5, posX: 64, posY: 12, widthFt: 5, heightFt: 5 },
      { objectType: 'table', tableShape: 'round', label: 'Group 4', seatCount: 5, posX: 12, posY: 42, widthFt: 5, heightFt: 5 },
      { objectType: 'table', tableShape: 'round', label: 'Group 5', seatCount: 5, posX: 38, posY: 42, widthFt: 5, heightFt: 5 },
      { objectType: 'table', tableShape: 'round', label: 'Group 6', seatCount: 5, posX: 64, posY: 42, widthFt: 5, heightFt: 5 },
    ],
  },
];

export function ArrangementPresetPicker({ onApplyPreset }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          Presets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Table Arrangements</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Choose a preset arrangement to add tables to your floor plan.
        </p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onApplyPreset(preset.objects)}
              className="w-full text-left border rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-sm">{preset.name}</div>
              <div className="text-xs text-muted-foreground">{preset.description}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {preset.objects.length} objects
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
