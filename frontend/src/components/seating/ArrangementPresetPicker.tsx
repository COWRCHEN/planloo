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
      { objectType: 'table', tableShape: 'round', label: 'Table 1', seatCount: 8, posX: 150, posY: 150 },
      { objectType: 'table', tableShape: 'round', label: 'Table 2', seatCount: 8, posX: 400, posY: 150 },
      { objectType: 'table', tableShape: 'round', label: 'Table 3', seatCount: 8, posX: 650, posY: 150 },
      { objectType: 'table', tableShape: 'round', label: 'Table 4', seatCount: 8, posX: 150, posY: 450 },
      { objectType: 'table', tableShape: 'round', label: 'Table 5', seatCount: 8, posX: 400, posY: 450 },
      { objectType: 'table', tableShape: 'round', label: 'Table 6', seatCount: 8, posX: 650, posY: 450 },
    ],
  },
  {
    name: 'Banquet Style',
    description: 'Head table with 4 round guest tables',
    objects: [
      { objectType: 'table', tableShape: 'head_table', label: 'Head Table', seatCount: 12, posX: 250, posY: 50, widthFt: 160, heightFt: 30 },
      { objectType: 'table', tableShape: 'round', label: 'Table 1', seatCount: 8, posX: 100, posY: 300 },
      { objectType: 'table', tableShape: 'round', label: 'Table 2', seatCount: 8, posX: 400, posY: 300 },
      { objectType: 'table', tableShape: 'round', label: 'Table 3', seatCount: 8, posX: 100, posY: 550 },
      { objectType: 'table', tableShape: 'round', label: 'Table 4', seatCount: 8, posX: 400, posY: 550 },
    ],
  },
  {
    name: 'Conference U-Shape',
    description: 'U-shaped table arrangement for meetings',
    objects: [
      { objectType: 'table', tableShape: 'rectangular', label: 'Left', seatCount: 6, posX: 150, posY: 150, widthFt: 40, heightFt: 200 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Center', seatCount: 6, posX: 190, posY: 350, widthFt: 300, heightFt: 40 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Right', seatCount: 6, posX: 450, posY: 150, widthFt: 40, heightFt: 200 },
    ],
  },
  {
    name: 'Classroom Style',
    description: 'Rows of rectangular tables facing front',
    objects: [
      { objectType: 'table', tableShape: 'rectangular', label: 'Row 1 Left', seatCount: 4, posX: 100, posY: 200, widthFt: 100, heightFt: 30 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Row 1 Right', seatCount: 4, posX: 300, posY: 200, widthFt: 100, heightFt: 30 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Row 2 Left', seatCount: 4, posX: 100, posY: 350, widthFt: 100, heightFt: 30 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Row 2 Right', seatCount: 4, posX: 300, posY: 350, widthFt: 100, heightFt: 30 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Row 3 Left', seatCount: 4, posX: 100, posY: 500, widthFt: 100, heightFt: 30 },
      { objectType: 'table', tableShape: 'rectangular', label: 'Row 3 Right', seatCount: 4, posX: 300, posY: 500, widthFt: 100, heightFt: 30 },
    ],
  },
  {
    name: 'Workshop Groups',
    description: 'Small group tables for collaborative work',
    objects: [
      { objectType: 'table', tableShape: 'round', label: 'Group 1', seatCount: 5, posX: 120, posY: 120, widthFt: 50, heightFt: 50 },
      { objectType: 'table', tableShape: 'round', label: 'Group 2', seatCount: 5, posX: 380, posY: 120, widthFt: 50, heightFt: 50 },
      { objectType: 'table', tableShape: 'round', label: 'Group 3', seatCount: 5, posX: 640, posY: 120, widthFt: 50, heightFt: 50 },
      { objectType: 'table', tableShape: 'round', label: 'Group 4', seatCount: 5, posX: 120, posY: 420, widthFt: 50, heightFt: 50 },
      { objectType: 'table', tableShape: 'round', label: 'Group 5', seatCount: 5, posX: 380, posY: 420, widthFt: 50, heightFt: 50 },
      { objectType: 'table', tableShape: 'round', label: 'Group 6', seatCount: 5, posX: 640, posY: 420, widthFt: 50, heightFt: 50 },
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
