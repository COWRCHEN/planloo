import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ObjectTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '@/hooks/use-object-templates';

interface Props {
  templates: ObjectTemplate[];
  onCreate: (data: CreateTemplateInput) => void;
  onUpdate: (templateUuid: string, data: UpdateTemplateInput) => void;
  onDelete: (templateUuid: string) => void;
  isCreating?: boolean;
}

const TABLE_SHAPE_OPTIONS = [
  { value: 'round', label: 'Round' },
  { value: 'rectangular', label: 'Rectangular' },
  { value: 'square', label: 'Square' },
  { value: 'oval', label: 'Oval' },
  { value: 'semicircle', label: 'Semicircle' },
  { value: 'head_table', label: 'Head Table' },
];

const ELEMENT_TYPE_OPTIONS = [
  { value: 'dance_floor', label: 'Dance Floor' },
  { value: 'bar', label: 'Bar' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'stage', label: 'Stage' },
  { value: 'dj_booth', label: 'DJ Booth' },
  { value: 'photo_booth', label: 'Photo Booth' },
  { value: 'entrance', label: 'Entrance' },
  { value: 'exit', label: 'Exit' },
  { value: 'restroom', label: 'Restroom' },
  { value: 'dessert_station', label: 'Dessert Station' },
  { value: 'gift_table', label: 'Gift Table' },
  { value: 'custom', label: 'Custom' },
];

const SIDED_SHAPES = ['rectangular', 'head_table', 'square'];

interface AddFormState {
  objectType: 'table' | 'element';
  tableShape: string;
  elementType: string;
  label: string;
  widthFt: string;
  heightFt: string;
  seatCount: string;
  seatTop: string;
  seatBottom: string;
  seatLeft: string;
  seatRight: string;
}

function getShapeLabel(shape: string): string {
  return TABLE_SHAPE_OPTIONS.find((o) => o.value === shape)?.label ?? shape;
}

function getElementLabel(type: string): string {
  return ELEMENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function defaultTableLabel(shape: string, seats: string): string {
  return `${getShapeLabel(shape)} (${seats})`;
}

function totalFromSides(form: AddFormState): number {
  return (Number(form.seatTop) || 0) + (Number(form.seatBottom) || 0) + (Number(form.seatLeft) || 0) + (Number(form.seatRight) || 0);
}

const INITIAL_TABLE_FORM: AddFormState = {
  objectType: 'table',
  tableShape: 'round',
  elementType: '',
  label: defaultTableLabel('round', '8'),
  widthFt: '60',
  heightFt: '60',
  seatCount: '8',
  seatTop: '0',
  seatBottom: '0',
  seatLeft: '0',
  seatRight: '0',
};

const INITIAL_ELEMENT_FORM: AddFormState = {
  objectType: 'element',
  tableShape: '',
  elementType: 'dance_floor',
  label: getElementLabel('dance_floor'),
  widthFt: '100',
  heightFt: '100',
  seatCount: '',
  seatTop: '0',
  seatBottom: '0',
  seatLeft: '0',
  seatRight: '0',
};

export function TemplateConfigDialog({ templates, onCreate, onUpdate, onDelete, isCreating }: Props) {
  const [showAddTable, setShowAddTable] = useState(false);
  const [showAddElement, setShowAddElement] = useState(false);
  const [tableForm, setTableForm] = useState<AddFormState>(INITIAL_TABLE_FORM);
  const [elementForm, setElementForm] = useState<AddFormState>(INITIAL_ELEMENT_FORM);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [confirmDeleteUuid, setConfirmDeleteUuid] = useState<string | null>(null);

  const tableTemplates = templates.filter((t) => t.objectType === 'table');
  const elementTemplates = templates.filter((t) => t.objectType === 'element');

  const handleAddTable = () => {
    if (!tableForm.label.trim()) return;
    const isSided = SIDED_SHAPES.includes(tableForm.tableShape);
    const total = isSided ? totalFromSides(tableForm) : Number(tableForm.seatCount);
    onCreate({
      objectType: 'table',
      tableShape: tableForm.tableShape,
      label: tableForm.label,
      widthFt: Number(tableForm.widthFt),
      heightFt: Number(tableForm.heightFt),
      seatCount: total,
      ...(isSided ? {
        seatTop: Number(tableForm.seatTop) || 0,
        seatBottom: Number(tableForm.seatBottom) || 0,
        seatLeft: Number(tableForm.seatLeft) || 0,
        seatRight: Number(tableForm.seatRight) || 0,
      } : {}),
    });
    setTableForm(INITIAL_TABLE_FORM);
    setShowAddTable(false);
  };

  const handleAddElement = () => {
    if (!elementForm.label.trim()) return;
    onCreate({
      objectType: 'element',
      elementType: elementForm.elementType,
      label: elementForm.label,
      widthFt: Number(elementForm.widthFt),
      heightFt: Number(elementForm.heightFt),
    });
    setElementForm(INITIAL_ELEMENT_FORM);
    setShowAddElement(false);
  };

  const startEditing = (t: ObjectTemplate) => {
    setEditingUuid(t.uuid);
    setEditLabel(t.label);
  };

  const saveEdit = (t: ObjectTemplate) => {
    if (editLabel.trim() && editLabel !== t.label) {
      onUpdate(t.uuid, { label: editLabel });
    }
    setEditingUuid(null);
  };

  const handleDelete = (uuid: string) => {
    if (confirmDeleteUuid === uuid) {
      onDelete(uuid);
      setConfirmDeleteUuid(null);
    } else {
      setConfirmDeleteUuid(uuid);
    }
  };

  return (
    <Dialog onOpenChange={() => { setConfirmDeleteUuid(null); setEditingUuid(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full text-xs h-7 mt-2">
          <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Configure Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Templates</DialogTitle>
        </DialogHeader>

        {/* Tables Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Tables</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setShowAddTable(!showAddTable)}
            >
              {showAddTable ? 'Cancel' : '+ Add Table'}
            </Button>
          </div>

          {showAddTable && (
            <div className="border rounded-md p-3 mb-2 space-y-2 bg-muted/30">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Shape</Label>
                  <Select
                    value={tableForm.tableShape}
                    onValueChange={(v) => {
                      const isSided = SIDED_SHAPES.includes(v);
                      const shapeDefaults: Record<string, [string, string]> = {
                        rectangular: ['160', '40'],
                        head_table: ['160', '40'],
                        square: ['40', '40'],
                        round: ['60', '60'],
                        oval: ['80', '50'],
                        semicircle: ['60', '30'],
                      };
                      const [defaultW, defaultH] = shapeDefaults[v] ?? ['60', '60'];
                      setTableForm((f) => {
                        const seats = isSided ? String(totalFromSides(f) || Number(f.seatCount)) : f.seatCount;
                        return { ...f, tableShape: v, widthFt: defaultW, heightFt: defaultH, label: defaultTableLabel(v, seats) };
                      });
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TABLE_SHAPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={tableForm.label}
                    onChange={(e) => setTableForm((f) => ({ ...f, label: e.target.value }))}
                    className="h-7 text-xs mt-1"
                    placeholder="e.g. Round (8)"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Width (ft)</Label>
                  <Input
                    type="number"
                    value={tableForm.widthFt}
                    onChange={(e) => setTableForm((f) => ({ ...f, widthFt: e.target.value }))}
                    className="h-7 text-xs mt-1"
                    min={1}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Height (ft)</Label>
                  <Input
                    type="number"
                    value={tableForm.heightFt}
                    onChange={(e) => setTableForm((f) => ({ ...f, heightFt: e.target.value }))}
                    className="h-7 text-xs mt-1"
                    min={1}
                  />
                </div>
              </div>
              {SIDED_SHAPES.includes(tableForm.tableShape) ? (
                <div>
                  <Label className="text-xs">Seats per side</Label>
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Top</Label>
                      <Input type="number" value={tableForm.seatTop} onChange={(e) => setTableForm((f) => { const updated = { ...f, seatTop: e.target.value }; return { ...updated, label: defaultTableLabel(f.tableShape, String(totalFromSides(updated))) }; })} className="h-6 text-xs" min={0} />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Bottom</Label>
                      <Input type="number" value={tableForm.seatBottom} onChange={(e) => setTableForm((f) => { const updated = { ...f, seatBottom: e.target.value }; return { ...updated, label: defaultTableLabel(f.tableShape, String(totalFromSides(updated))) }; })} className="h-6 text-xs" min={0} />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Left</Label>
                      <Input type="number" value={tableForm.seatLeft} onChange={(e) => setTableForm((f) => { const updated = { ...f, seatLeft: e.target.value }; return { ...updated, label: defaultTableLabel(f.tableShape, String(totalFromSides(updated))) }; })} className="h-6 text-xs" min={0} />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Right</Label>
                      <Input type="number" value={tableForm.seatRight} onChange={(e) => setTableForm((f) => { const updated = { ...f, seatRight: e.target.value }; return { ...updated, label: defaultTableLabel(f.tableShape, String(totalFromSides(updated))) }; })} className="h-6 text-xs" min={0} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Total: {totalFromSides(tableForm)} seats</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Seats</Label>
                    <Input
                      type="number"
                      value={tableForm.seatCount}
                      onChange={(e) => setTableForm((f) => ({ ...f, seatCount: e.target.value, label: defaultTableLabel(f.tableShape, e.target.value) }))}
                      className="h-7 text-xs mt-1"
                      min={1}
                    />
                  </div>
                </div>
              )}
              <Button size="sm" className="h-7 text-xs w-full" onClick={handleAddTable} disabled={isCreating || !tableForm.label.trim()}>
                Add Table Template
              </Button>
            </div>
          )}

          <div className="space-y-1">
            {tableTemplates.map((t) => (
              <TemplateRow
                key={t.uuid}
                template={t}
                isEditing={editingUuid === t.uuid}
                editLabel={editLabel}
                onEditLabelChange={setEditLabel}
                onStartEdit={() => startEditing(t)}
                onSaveEdit={() => saveEdit(t)}
                onCancelEdit={() => setEditingUuid(null)}
                onDelete={() => handleDelete(t.uuid)}
                isConfirmingDelete={confirmDeleteUuid === t.uuid}
              />
            ))}
            {tableTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">No table templates</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Elements Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Elements</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setShowAddElement(!showAddElement)}
            >
              {showAddElement ? 'Cancel' : '+ Add Element'}
            </Button>
          </div>

          {showAddElement && (
            <div className="border rounded-md p-3 mb-2 space-y-2 bg-muted/30">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={elementForm.elementType}
                    onValueChange={(v) => setElementForm((f) => ({ ...f, elementType: v, label: getElementLabel(v) }))}
                  >
                    <SelectTrigger className="h-7 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ELEMENT_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={elementForm.label}
                    onChange={(e) => setElementForm((f) => ({ ...f, label: e.target.value }))}
                    className="h-7 text-xs mt-1"
                    placeholder="e.g. Bar"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Width (ft)</Label>
                  <Input
                    type="number"
                    value={elementForm.widthFt}
                    onChange={(e) => setElementForm((f) => ({ ...f, widthFt: e.target.value }))}
                    className="h-7 text-xs mt-1"
                    min={1}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Height (ft)</Label>
                  <Input
                    type="number"
                    value={elementForm.heightFt}
                    onChange={(e) => setElementForm((f) => ({ ...f, heightFt: e.target.value }))}
                    className="h-7 text-xs mt-1"
                    min={1}
                  />
                </div>
              </div>
              <Button size="sm" className="h-7 text-xs w-full" onClick={handleAddElement} disabled={isCreating || !elementForm.label.trim()}>
                Add Element Template
              </Button>
            </div>
          )}

          <div className="space-y-1">
            {elementTemplates.map((t) => (
              <TemplateRow
                key={t.uuid}
                template={t}
                isEditing={editingUuid === t.uuid}
                editLabel={editLabel}
                onEditLabelChange={setEditLabel}
                onStartEdit={() => startEditing(t)}
                onSaveEdit={() => saveEdit(t)}
                onCancelEdit={() => setEditingUuid(null)}
                onDelete={() => handleDelete(t.uuid)}
                isConfirmingDelete={confirmDeleteUuid === t.uuid}
              />
            ))}
            {elementTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">No element templates</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplateRow({
  template,
  isEditing,
  editLabel,
  onEditLabelChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  isConfirmingDelete,
}: {
  template: ObjectTemplate;
  isEditing: boolean;
  editLabel: string;
  onEditLabelChange: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  isConfirmingDelete: boolean;
}) {
  const dims = `${template.widthFt}x${template.heightFt}ft`;
  const hasSideInfo = template.seatTop != null && SIDED_SHAPES.includes(template.tableShape ?? '');
  const seats = template.seatCount
    ? hasSideInfo
      ? ` / ${template.seatCount} seats (T${template.seatTop} B${template.seatBottom} L${template.seatLeft} R${template.seatRight})`
      : ` / ${template.seatCount} seats`
    : '';

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 group">
      <TemplateIcon template={template} />
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editLabel}
            onChange={(e) => onEditLabelChange(e.target.value)}
            className="h-6 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
        ) : (
          <>
            <p className="text-xs font-medium truncate">{template.label}</p>
            <p className="text-[10px] text-muted-foreground">{dims}{seats}</p>
          </>
        )}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {isEditing ? (
          <>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onSaveEdit}>
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8l3.5 3.5L13 5" />
              </svg>
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onCancelEdit}>
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onStartEdit}>
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 ${isConfirmingDelete ? 'text-destructive' : ''}`}
              onClick={onDelete}
            >
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function TemplateIcon({ template }: { template: ObjectTemplate }) {
  const className = 'w-4 h-4 flex-shrink-0 text-muted-foreground';
  if (template.objectType === 'table') {
    if (template.tableShape === 'round') {
      return (
        <svg className={className} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    }
    if (template.tableShape === 'rectangular' || template.tableShape === 'head_table') {
      return (
        <svg className={className} viewBox="0 0 16 16">
          <rect x="1" y="4" width="14" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    }
    if (template.tableShape === 'oval') {
      return (
        <svg className={className} viewBox="0 0 16 16">
          <ellipse cx="8" cy="8" rx="7" ry="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    }
    if (template.tableShape === 'semicircle') {
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
  // Element
  if (template.elementType === 'dance_floor') {
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
