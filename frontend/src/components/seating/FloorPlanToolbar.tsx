import { Button } from '@/components/ui/button';
import { useStore } from '@nanostores/react';
import { $zoom, $panOffset, $gridVisible } from '@/stores/seating';

interface Props {
  planName?: string;
  isSaving?: boolean;
}

export function FloorPlanToolbar({ planName, isSaving }: Props) {
  const zoom = useStore($zoom);
  const gridVisible = useStore($gridVisible);

  return (
    <div className="flex items-center justify-between border-b bg-white px-3 py-1.5">
      <div className="flex items-center gap-2 text-sm">
        {planName && <span className="font-medium">{planName}</span>}
        {isSaving && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => $gridVisible.set(!gridVisible)}
          className="text-xs h-7 px-2"
        >
          {gridVisible ? 'Hide Grid' : 'Show Grid'}
        </Button>
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => $zoom.set(Math.max(0.25, zoom - 0.1))}
            className="h-7 w-7 p-0 text-lg"
          >
            -
          </Button>
          <span className="text-xs px-2 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => $zoom.set(Math.min(3, zoom + 0.1))}
            className="h-7 w-7 p-0 text-lg"
          >
            +
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { $zoom.set(1); $panOffset.set({ x: 0, y: 0 }); }}
          className="text-xs h-7 px-2"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
