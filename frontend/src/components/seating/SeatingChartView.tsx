import { useState, useCallback, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { $selectedObjectUuids } from '@/stores/seating';
import {
  useFloorPlans,
  useFloorPlan,
  useCreateFloorPlan,
  useDeleteFloorPlan,
  type FloorPlanDetailResponse,
} from '@/hooks/use-floor-plans';
import {
  useCreateObject,
  useUpdateObject,
  useDeleteObject,
  useBulkUpdatePositions,
  useAssignGuest,
  useUnassignGuest,
  useAutoAssign,
  useUnassignedGuests,
  useConflicts,
  type CreateObjectInput,
  type BulkPositionUpdate,
} from '@/hooks/use-floor-plan-objects';
import { FloorPlanCanvas } from './FloorPlanCanvas';
import { FloorPlanToolbar } from './FloorPlanToolbar';
import { ObjectPalette } from './ObjectPalette';
import { ObjectPropertyPanel } from './ObjectPropertyPanel';
import { GuestAssignmentPanel } from './GuestAssignmentPanel';
import { SeatingChartStats } from './SeatingChartStats';
import { ConflictAlerts } from './ConflictAlerts';
import { GuestRelationshipsDialog } from './GuestRelationshipsDialog';
import { AutoAssignDialog } from './AutoAssignDialog';
import { ArrangementPresetPicker } from './ArrangementPresetPicker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useBilling } from '@/hooks/use-billing';
import { FeatureGate } from '@/components/billing/FeatureGate';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import { PlanLimitError } from '@/lib/api-error';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

interface Props {
  eventUuid: string | undefined;
}

export function SeatingChartView({ eventUuid }: Props) {
  if (!eventUuid) return <p className="text-muted-foreground">No event UUID provided.</p>;

  return (
    <QueryClientProvider client={queryClient}>
      <SeatingChartInner eventUuid={eventUuid} />
    </QueryClientProvider>
  );
}

export function SeatingChartInner({ eventUuid }: { eventUuid: string }) {
  const [activePlanUuid, setActivePlanUuid] = useState<string | undefined>();
  const [selectedObjectUuid, setSelectedObjectUuid] = useState<string | null>(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [showNewPlanInput, setShowNewPlanInput] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [confirmDeletePlanUuid, setConfirmDeletePlanUuid] = useState<string | null>(null);
  const [confirmDeleteObjectUuid, setConfirmDeleteObjectUuid] = useState<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    if (!canvasContainerRef.current) return;
    if (!document.fullscreenElement) {
      canvasContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Sync isFullscreen state with fullscreenchange event (flushSync ensures
  // the DOM height update happens in the same tick as the browser exiting
  // fullscreen, preventing a frame where 100vh is applied in normal flow
  // which would cause page-level scrollbars).
  useEffect(() => {
    const onChange = () => {
      flushSync(() => setIsFullscreen(!!document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Billing / plan limits
  const { data: billingData, isLoading: billingLoading } = useBilling();

  // Data fetching
  const { data: plans = [], isLoading: plansLoading } = useFloorPlans(eventUuid);
  const { data: planDetail, isLoading: detailLoading } = useFloorPlan(eventUuid, activePlanUuid);
  const { data: unassignedGuests = [] } = useUnassignedGuests(eventUuid, activePlanUuid);
  const { data: conflicts = [] } = useConflicts(eventUuid, activePlanUuid);

  // Mutations
  const createPlan = useCreateFloorPlan(eventUuid);
  const deletePlan = useDeleteFloorPlan(eventUuid);
  const createObject = useCreateObject(eventUuid, activePlanUuid ?? '');
  const updateObject = useUpdateObject(eventUuid, activePlanUuid ?? '');
  const deleteObject = useDeleteObject(eventUuid, activePlanUuid ?? '');
  const { debouncedSave, isPending: isSaving } = useBulkUpdatePositions(eventUuid, activePlanUuid ?? '');
  const assignGuest = useAssignGuest(eventUuid, activePlanUuid ?? '');
  const unassignGuest = useUnassignGuest(eventUuid, activePlanUuid ?? '');
  const autoAssign = useAutoAssign(eventUuid, activePlanUuid ?? '');

  // Auto-select first/default plan
  useEffect(() => {
    if (plans.length > 0 && !activePlanUuid) {
      const defaultPlan = plans.find((p) => p.isDefault) ?? plans[0];
      if (defaultPlan) setActivePlanUuid(defaultPlan.uuid);
    }
  }, [plans, activePlanUuid]);

  // Local optimistic position state
  const [localPositions, setLocalPositions] = useState<Record<string, { posX: number; posY: number }>>({});

  // Reset local positions when plan detail changes
  useEffect(() => {
    setLocalPositions({});
  }, [planDetail?.uuid]);

  const handleObjectDragged = useCallback(
    (update: BulkPositionUpdate) => {
      // Optimistic local update
      setLocalPositions((prev) => ({
        ...prev,
        [update.uuid]: { posX: update.posX, posY: update.posY },
      }));
      // Debounced save to server
      debouncedSave(update);
    },
    [debouncedSave]
  );

  const handleSelectObject = useCallback((uuid: string | null) => {
    setSelectedObjectUuid(uuid);
    $selectedObjectUuids.set(uuid ? [uuid] : []);
  }, []);

  const handleRequestDeleteObject = useCallback((uuid: string) => {
    setConfirmDeleteObjectUuid(uuid);
  }, []);

  const handleConfirmDeleteObject = useCallback(() => {
    if (!confirmDeleteObjectUuid) return;
    deleteObject.mutate(confirmDeleteObjectUuid);
    if (selectedObjectUuid === confirmDeleteObjectUuid) {
      handleSelectObject(null);
    }
    setConfirmDeleteObjectUuid(null);
  }, [confirmDeleteObjectUuid, deleteObject, selectedObjectUuid, handleSelectObject]);

  // Delete selected object on Delete / Backspace key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (!selectedObjectUuid) return;
      e.preventDefault();
      handleRequestDeleteObject(selectedObjectUuid);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedObjectUuid, handleRequestDeleteObject]);

  const handleCreatePlan = () => {
    if (!newPlanName.trim()) return;
    createPlan.mutate(
      { name: newPlanName.trim() },
      {
        onSuccess: (data) => {
          if (data) setActivePlanUuid(data.uuid);
          setNewPlanName('');
          setShowNewPlanInput(false);
        },
      }
    );
  };

  const handleDeletePlan = () => {
    if (!confirmDeletePlanUuid) return;
    const planUuid = confirmDeletePlanUuid;
    deletePlan.mutate(planUuid, {
      onSuccess: () => {
        setConfirmDeletePlanUuid(null);
        if (activePlanUuid === planUuid) {
          handleSelectObject(null);
          setLocalPositions({});
          const remaining = plans.filter((p) => p.uuid !== planUuid);
          setActivePlanUuid(remaining[0]?.uuid);
        }
      },
    });
  };

  const handleAddObject = (input: CreateObjectInput) => {
    createObject.mutate(input);
  };

  const handleApplyPreset = (objects: CreateObjectInput[]) => {
    for (const obj of objects) {
      createObject.mutate(obj);
    }
  };

  // Merge local optimistic positions into plan detail
  const planWithLocalPositions: FloorPlanDetailResponse | undefined = planDetail
    ? {
        ...planDetail,
        objects: planDetail.objects.map((obj) => {
          const local = localPositions[obj.uuid];
          return local ? { ...obj, posX: local.posX, posY: local.posY } : obj;
        }),
      }
    : undefined;

  const selectedObject = planWithLocalPositions?.objects.find((o) => o.uuid === selectedObjectUuid);

  // Collect all guests for relationships dialog (assigned + unassigned)
  const allGuests = [
    ...(planDetail?.objects.flatMap((o) =>
      o.assignments.map((a) => ({ uuid: a.guestUuid, firstName: a.guestFirstName, lastName: a.guestLastName }))
    ) ?? []),
    ...unassignedGuests.map((g) => ({ uuid: g.uuid, firstName: g.firstName, lastName: g.lastName })),
  ];
  // Deduplicate
  const guestMap = new Map(allGuests.map((g) => [g.uuid, g]));
  const uniqueGuests = [...guestMap.values()];

  // Loading state
  if (billingLoading || plansLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Feature gate: floor plans not available on this plan
  if (billingData && !billingData.limits.floorPlans) {
    return (
      <FeatureGate
        featureName="Floor Plans"
        description="Design your venue layout and assign guests to seats with interactive floor plans."
        requiredPlan="Planner"
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Plan tabs + actions bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          {plans.map((p) => (
            <div key={p.uuid} className="flex items-center">
              <Button
                variant={p.uuid === activePlanUuid ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivePlanUuid(p.uuid)}
                className="text-xs rounded-r-none"
              >
                {p.name}
              </Button>
              <Button
                variant={p.uuid === activePlanUuid ? 'default' : 'outline'}
                size="sm"
                className="text-xs px-1 rounded-l-none border-l-0"
                onClick={() => setConfirmDeletePlanUuid(p.uuid)}
              >
                <svg className="w-3 h-3 text-destructive" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </Button>
            </div>
          ))}
          {showNewPlanInput ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <Input
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="Plan name"
                  className="h-8 text-xs w-32"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePlan()}
                  autoFocus
                />
                <Button size="sm" onClick={handleCreatePlan} disabled={createPlan.isPending} className="text-xs h-8">
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewPlanInput(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
              </div>
              {createPlan.error instanceof PlanLimitError && (
                <UpgradePrompt error={createPlan.error} className="mt-2" />
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewPlanInput(true)}
              className="text-xs"
            >
              + New Plan
            </Button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ArrangementPresetPicker onApplyPreset={handleApplyPreset} />
          <AutoAssignDialog
            unassignedGuests={unassignedGuests}
            onAutoAssign={(uuids) => autoAssign.mutate(uuids)}
            isAutoAssigning={autoAssign.isPending}
          />
          <GuestRelationshipsDialog eventUuid={eventUuid} allGuests={uniqueGuests} />
          <a
            href={`/dashboard/events/${eventUuid}/guests`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Guest List
          </a>
          <a
            href={`/dashboard/events/${eventUuid}`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Back to Event
          </a>
        </div>
      </div>

      {/* Stats */}
      <SeatingChartStats plan={planWithLocalPositions} unassignedCount={unassignedGuests.length} />

      {/* Conflicts */}
      <ConflictAlerts
        conflicts={conflicts}
        onSelectObject={(uuid) => handleSelectObject(uuid)}
      />

      {/* Main layout: palette + canvas + property/assignment panel */}
      {activePlanUuid && planWithLocalPositions ? (
        <div ref={canvasContainerRef} className="border rounded-lg overflow-hidden flex bg-white" style={{ height: isFullscreen ? '100vh' : '60vh', minHeight: 400 }}>
          {/* Left: Object Palette */}
          <ObjectPalette
            eventUuid={eventUuid}
            planUuid={activePlanUuid}
            onAddObject={handleAddObject}
            isAdding={createObject.isPending}
          />

          {/* Center: Canvas + overlaid right panel */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <FloorPlanToolbar planName={planWithLocalPositions.name} isSaving={isSaving} isFullscreen={isFullscreen} onToggleFullscreen={handleToggleFullscreen} />
            <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
              <FloorPlanCanvas
                plan={planWithLocalPositions}
                onObjectDragged={handleObjectDragged}
                onSelectObject={handleSelectObject}
                onDropTemplate={handleAddObject}
              />

              {/* Right: Property or Assignment Panel (absolutely positioned so it doesn't shift layout) */}
              {selectedObject && selectedObject.objectType === 'table' ? (
                <div className="absolute top-0 right-0 h-full z-10">
                  <GuestAssignmentPanel
                    object={selectedObject}
                    unassignedGuests={unassignedGuests}
                    onAssign={(guestUuid, seatNumber) =>
                      assignGuest.mutate({
                        objectUuid: selectedObject.uuid,
                        assignments: [{ guestUuid, seatNumber }],
                      })
                    }
                    onUnassign={(guestUuid) =>
                      unassignGuest.mutate({
                        objectUuid: selectedObject.uuid,
                        guestUuid,
                      })
                    }
                    onRename={(newLabel) =>
                      updateObject.mutate({ objectUuid: selectedObject.uuid, data: { label: newLabel } })
                    }
                    onDelete={() => handleRequestDeleteObject(selectedObject.uuid)}
                    onClose={() => handleSelectObject(null)}
                    isAssigning={assignGuest.isPending}
                    isDeleting={deleteObject.isPending}
                  />
                </div>
              ) : selectedObject ? (
                <div className="absolute top-0 right-0 h-full z-10">
                  <ObjectPropertyPanel
                    object={selectedObject}
                    onUpdate={(data) =>
                      updateObject.mutate({ objectUuid: selectedObject.uuid, data })
                    }
                    onDelete={() => handleRequestDeleteObject(selectedObject.uuid)}
                    onClose={() => handleSelectObject(null)}
                    isUpdating={updateObject.isPending}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : detailLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : plans.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">No floor plans yet</p>
          <p className="text-sm mb-4">Create your first floor plan to start designing your seating chart.</p>
          <Button
            onClick={() => setShowNewPlanInput(true)}
            className="text-sm"
          >
            Create Floor Plan
          </Button>
        </div>
      ) : null}

      {/* Delete plan confirmation dialog */}
      <Dialog open={!!confirmDeletePlanUuid} onOpenChange={(open) => { if (!open) setConfirmDeletePlanUuid(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{plans.find((p) => p.uuid === confirmDeletePlanUuid)?.name}&rdquo;? All objects and seat assignments in this plan will be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDeletePlanUuid(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeletePlan} disabled={deletePlan.isPending}>
              {deletePlan.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete object confirmation dialog */}
      <Dialog open={!!confirmDeleteObjectUuid} onOpenChange={(open) => { if (!open) setConfirmDeleteObjectUuid(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {(() => {
              const obj = planWithLocalPositions?.objects.find((o) => o.uuid === confirmDeleteObjectUuid);
              return obj?.objectType === 'table' ? 'Table' : 'Element';
            })()}</DialogTitle>
            <DialogDescription>
              {(() => {
                const obj = planWithLocalPositions?.objects.find((o) => o.uuid === confirmDeleteObjectUuid);
                if (!obj) return 'Are you sure?';
                const assignedCount = obj.assignments?.length ?? 0;
                if (assignedCount > 0) {
                  return `"${obj.label}" has ${assignedCount} guest${assignedCount > 1 ? 's' : ''} assigned. Deleting it will unassign them. This cannot be undone.`;
                }
                return `Are you sure you want to delete "${obj.label}"? This cannot be undone.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDeleteObjectUuid(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDeleteObject} disabled={deleteObject.isPending}>
              {deleteObject.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
