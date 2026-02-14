import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ConflictResponse } from '@/hooks/use-floor-plan-objects';

interface Props {
  conflicts: ConflictResponse[];
  onSelectObject?: (uuid: string) => void;
}

export function ConflictAlerts({ conflicts, onSelectObject }: Props) {
  if (conflicts.length === 0) return null;

  return (
    <div className="space-y-2">
      {conflicts.map((conflict, i) => (
        <Alert key={i} variant="destructive" className="py-2">
          <AlertDescription className="flex items-center gap-2 text-sm">
            <span>{conflict.type === 'over_capacity' ? 'Over capacity' : 'Avoid pair'}</span>
            <span className="text-xs">—</span>
            <span className="flex-1">{conflict.message}</span>
            {conflict.objectUuid && onSelectObject && (
              <button
                onClick={() => onSelectObject(conflict.objectUuid!)}
                className="text-xs underline hover:no-underline"
              >
                Show
              </button>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
