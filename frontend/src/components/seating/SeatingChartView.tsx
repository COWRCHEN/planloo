import { useState, useCallback, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { $selectedObjectUuids } from '@/stores/seating';
import {
  useFloorPlans,
  useFloorPlan,
  useCreateFloorPlan,
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

function SeatingChartInner({ eventUuid }: { eventUuid: string }) {
  const [activePlanUuid, setActivePlanUuid] = useState<string | undefined>();
  const [selectedObjectUuid, setSelectedObjectUuid] = useState<string | null>(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [showNewPlanInput, setShowNewPlanInput] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  // Sync isFullscreen state with fullscreenchange event
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Data fetching
  const { data: plans = [], isLoading: plansLoading } = useFloorPlans(eventUuid);
  const { data: planDetail, isLoading: detailLoading } = useFloorPlan(eventUuid, activePlanUuid);
  const { data: unassignedGuests = [] } = useUnassignedGuests(eventUuid, activePlanUuid);
  const { data: conflicts = [] } = useConflicts(eventUuid, activePlanUuid);

  // Mutations
  const createPlan = useCreateFloorPlan(eventUuid);
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
  if (plansLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Plan tabs + actions bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {plans.map((p) => (
            <Button
              key={p.uuid}
              variant={p.uuid === activePlanUuid ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActivePlanUuid(p.uuid)}
              className="text-xs"
            >
              {p.name}
            </Button>
          ))}
          {showNewPlanInput ? (
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

        <div className="flex items-center gap-1">
          <ArrangementPresetPicker onApplyPreset={handleApplyPreset} />
          <AutoAssignDialog
            unassignedGuests={unassignedGuests}
            onAutoAssign={(uuids) => autoAssign.mutate(uuids)}
            isAutoAssigning={autoAssign.isPending}
          />
          <GuestRelationshipsDialog eventUuid={eventUuid} allGuests={uniqueGuests} />
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
            onAddObject={handleAddObject}
            isAdding={createObject.isPending}
          />

          {/* Center: Canvas + overlaid right panel */}
          <div className="flex-1 flex flex-col">
            <FloorPlanToolbar planName={planWithLocalPositions.name} isSaving={isSaving} isFullscreen={isFullscreen} onToggleFullscreen={handleToggleFullscreen} />
            <div className="flex-1 relative flex flex-col min-h-0">
              <FloorPlanCanvas
                plan={planWithLocalPositions}
                onObjectDragged={handleObjectDragged}
                onSelectObject={handleSelectObject}
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
                    onClose={() => handleSelectObject(null)}
                    isAssigning={assignGuest.isPending}
                  />
                </div>
              ) : selectedObject ? (
                <div className="absolute top-0 right-0 h-full z-10">
                  <ObjectPropertyPanel
                    object={selectedObject}
                    onUpdate={(data) =>
                      updateObject.mutate({ objectUuid: selectedObject.uuid, data })
                    }
                    onDelete={() => {
                      deleteObject.mutate(selectedObject.uuid);
                      handleSelectObject(null);
                    }}
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
    </div>
  );
}
