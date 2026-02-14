import { Button } from '@/components/ui/button';
import type { CreateObjectInput } from '@/hooks/use-floor-plan-objects';

interface Props {
  onAddObject: (input: CreateObjectInput) => void;
  isAdding?: boolean;
}

const TABLE_PRESETS: Array<{ label: string; shape: string; seatCount: number; widthFt?: number; heightFt?: number }> = [
  { label: 'Round (8)', shape: 'round', seatCount: 8 },
  { label: 'Round (10)', shape: 'round', seatCount: 10, widthFt: 7, heightFt: 7 },
  { label: 'Round (6)', shape: 'round', seatCount: 6, widthFt: 5, heightFt: 5 },
  { label: 'Rectangular', shape: 'rectangular', seatCount: 8, widthFt: 10, heightFt: 4 },
  { label: 'Square (4)', shape: 'square', seatCount: 4, widthFt: 4, heightFt: 4 },
  { label: 'Head Table', shape: 'head_table', seatCount: 12, widthFt: 16, heightFt: 3 },
];

const ELEMENT_PRESETS: Array<{ label: string; elementType: string; widthFt: number; heightFt: number }> = [
  { label: 'Dance Floor', elementType: 'dance_floor', widthFt: 20, heightFt: 20 },
  { label: 'Bar', elementType: 'bar', widthFt: 10, heightFt: 4 },
  { label: 'Buffet', elementType: 'buffet', widthFt: 12, heightFt: 3 },
  { label: 'Stage', elementType: 'stage', widthFt: 16, heightFt: 8 },
  { label: 'DJ Booth', elementType: 'dj_booth', widthFt: 6, heightFt: 4 },
  { label: 'Entrance', elementType: 'entrance', widthFt: 4, heightFt: 4 },
  { label: 'Exit', elementType: 'exit', widthFt: 4, heightFt: 4 },
];

export function ObjectPalette({ onAddObject, isAdding }: Props) {
  return (
    <div className="w-52 border-r bg-white p-3 overflow-y-auto">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Tables
      </h3>
      <div className="space-y-1 mb-4">
        {TABLE_PRESETS.map((preset) => (
          <Button
            key={preset.shape + preset.seatCount}
            variant="outline"
            size="sm"
            disabled={isAdding}
            onClick={() =>
              onAddObject({
                objectType: 'table',
                tableShape: preset.shape,
                label: preset.label.split(' (')[0]!,
                seatCount: preset.seatCount,
                widthFt: preset.widthFt,
                heightFt: preset.heightFt,
              })
            }
            className="w-full justify-start text-xs h-8"
          >
            <TableIcon shape={preset.shape} />
            <span className="ml-2">{preset.label}</span>
          </Button>
        ))}
      </div>

      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Elements
      </h3>
      <div className="space-y-1">
        {ELEMENT_PRESETS.map((preset) => (
          <Button
            key={preset.elementType}
            variant="outline"
            size="sm"
            disabled={isAdding}
            onClick={() =>
              onAddObject({
                objectType: 'element',
                elementType: preset.elementType,
                label: preset.label,
                widthFt: preset.widthFt,
                heightFt: preset.heightFt,
              })
            }
            className="w-full justify-start text-xs h-8"
          >
            <ElementIcon type={preset.elementType} />
            <span className="ml-2">{preset.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function TableIcon({ shape }: { shape: string }) {
  const className = 'w-4 h-4 flex-shrink-0';
  if (shape === 'round') {
    return (
      <svg className={className} viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (shape === 'rectangular' || shape === 'head_table') {
    return (
      <svg className={className} viewBox="0 0 16 16">
        <rect x="1" y="4" width="14" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 16 16">
      <rect x="3" y="3" width="10" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ElementIcon({ type }: { type: string }) {
  const className = 'w-4 h-4 flex-shrink-0';
  if (type === 'dance_floor') {
    return (
      <svg className={className} viewBox="0 0 16 16">
        <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 16 16">
      <rect x="2" y="4" width="12" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
