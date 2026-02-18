import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { CreateObjectInput } from '@/hooks/use-floor-plan-objects';
import {
  useObjectTemplates,
  useUpdateTemplate,
  useDeleteTemplate,
  useCreateTemplate,
  type ObjectTemplate,
} from '@/hooks/use-object-templates';
import { TemplateEditPopover } from './TemplateEditPopover';
import { TemplateConfigDialog } from './TemplateConfigDialog';

interface Props {
  eventUuid: string;
  planUuid: string;
  onAddObject: (input: CreateObjectInput) => void;
  isAdding?: boolean;
}

export function ObjectPalette({ eventUuid, planUuid, onAddObject, isAdding }: Props) {
  const { data: templates = [], isLoading } = useObjectTemplates(eventUuid, planUuid);
  const updateTemplate = useUpdateTemplate(eventUuid, planUuid);
  const deleteTemplate = useDeleteTemplate(eventUuid, planUuid);
  const createTemplate = useCreateTemplate(eventUuid, planUuid);

  const tableTemplates = templates.filter((t) => t.objectType === 'table');
  const elementTemplates = templates.filter((t) => t.objectType === 'element');

  const handleAddFromTemplate = (template: ObjectTemplate) => {
    const input: CreateObjectInput = {
      objectType: template.objectType,
      label: template.label.replace(/\s*\(\d+\)\s*$/, ''),
      widthFt: template.widthFt,
      heightFt: template.heightFt,
    };
    if (template.objectType === 'table') {
      input.tableShape = template.tableShape ?? undefined;
      input.seatCount = template.seatCount ?? undefined;
      input.seatTop = template.seatTop ?? undefined;
      input.seatBottom = template.seatBottom ?? undefined;
      input.seatLeft = template.seatLeft ?? undefined;
      input.seatRight = template.seatRight ?? undefined;
    } else {
      input.elementType = template.elementType ?? undefined;
    }
    onAddObject(input);
  };

  if (isLoading) {
    return (
      <div className="w-52 border-r bg-white p-3">
        <Skeleton className="h-3 w-16 mb-3" />
        <div className="space-y-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <Skeleton className="h-3 w-20 mt-4 mb-3" />
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-52 border-r bg-white p-3 overflow-y-auto flex flex-col">
      <div className="flex-1">
        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Tables
        </h3>
        <div className="space-y-1 mb-4">
          {tableTemplates.map((template) => (
            <div key={template.uuid} className="group relative">
              <Button
                variant="outline"
                size="sm"
                disabled={isAdding}
                onClick={() => handleAddFromTemplate(template)}
                className="w-full justify-start text-xs h-8 pr-7"
              >
                <TableIcon shape={template.tableShape} />
                <span className="ml-2 truncate">{template.label}</span>
              </Button>
              <TemplateEditPopover
                template={template}
                onUpdate={(uuid, data) => updateTemplate.mutate({ templateUuid: uuid, data })}
                onDelete={(uuid) => deleteTemplate.mutate(uuid)}
                isUpdating={updateTemplate.isPending}
              >
                <button
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-3 h-3 text-muted-foreground" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
                  </svg>
                </button>
              </TemplateEditPopover>
            </div>
          ))}
        </div>

        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Elements
        </h3>
        <div className="space-y-1">
          {elementTemplates.map((template) => (
            <div key={template.uuid} className="group relative">
              <Button
                variant="outline"
                size="sm"
                disabled={isAdding}
                onClick={() => handleAddFromTemplate(template)}
                className="w-full justify-start text-xs h-8 pr-7"
              >
                <ElementIcon type={template.elementType} />
                <span className="ml-2 truncate">{template.label}</span>
              </Button>
              <TemplateEditPopover
                template={template}
                onUpdate={(uuid, data) => updateTemplate.mutate({ templateUuid: uuid, data })}
                onDelete={(uuid) => deleteTemplate.mutate(uuid)}
                isUpdating={updateTemplate.isPending}
              >
                <button
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-3 h-3 text-muted-foreground" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
                  </svg>
                </button>
              </TemplateEditPopover>
            </div>
          ))}
        </div>
      </div>

      {/* Configure Templates button at bottom */}
      <TemplateConfigDialog
        templates={templates}
        onCreate={(data) => createTemplate.mutate(data)}
        onUpdate={(uuid, data) => updateTemplate.mutate({ templateUuid: uuid, data })}
        onDelete={(uuid) => deleteTemplate.mutate(uuid)}
        isCreating={createTemplate.isPending}
      />
    </div>
  );
}

function TableIcon({ shape }: { shape: string | null }) {
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
  if (shape === 'oval') {
    return (
      <svg className={className} viewBox="0 0 16 16">
        <ellipse cx="8" cy="8" rx="7" ry="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (shape === 'semicircle') {
    return (
      <svg className={className} viewBox="0 0 16 16">
        <path d="M2 10 A6 6 0 0 1 14 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="2" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 16 16">
      <rect x="3" y="3" width="10" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ElementIcon({ type }: { type: string | null }) {
  const className = 'w-4 h-4 flex-shrink-0';
  if (type === 'dance_floor') {
    return (
      <svg className={className} viewBox="0 0 16 16">
        <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
    );
  }
  if (type === 'entrance' || type === 'exit') {
    return (
      <svg className={className} viewBox="0 0 16 16">
        <rect x="3" y="2" width="10" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 6v4M6 8h4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === 'stage') {
    return (
      <svg className={className} viewBox="0 0 16 16">
        <path d="M1 5h14v8H1z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 5V3h10v2" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 16 16">
      <rect x="2" y="4" width="12" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
