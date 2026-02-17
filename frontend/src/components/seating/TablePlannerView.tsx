import { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useFloorPlans,
  useFloorPlan,
  useCreateFloorPlan,
} from '@/hooks/use-floor-plans';
import {
  useCreateObject,
  useUpdateObject,
  useDeleteObject,
  useAssignGuest,
  useUnassignGuest,
  useAutoAssign,
  useUnassignedGuests,
  useConflicts,
} from '@/hooks/use-floor-plan-objects';
import { SeatingChartStats } from './SeatingChartStats';
import { ConflictAlerts } from './ConflictAlerts';
import { AutoAssignDialog } from './AutoAssignDialog';
import { GuestRelationshipsDialog } from './GuestRelationshipsDialog';
import { AddTableForm } from './AddTableForm';
import { TableCard } from './TableCard';

interface Props {
  eventUuid: string;
}

export function TablePlannerView({ eventUuid }: Props) {
  const [activePlanUuid, setActivePlanUuid] = useState<string | undefined>();
  const autoCreatedRef = useRef(false);

  // Data fetching
  const { data: plans = [], isLoading: plansLoading } = useFloorPlans(eventUuid);
  const { data: planDetail } = useFloorPlan(eventUuid, activePlanUuid);
  const { data: unassignedGuests = [] } = useUnassignedGuests(eventUuid, activePlanUuid);
  const { data: conflicts = [] } = useConflicts(eventUuid, activePlanUuid);

  // Mutations
  const createPlan = useCreateFloorPlan(eventUuid);
  const createObject = useCreateObject(eventUuid, activePlanUuid ?? '');
  const updateObject = useUpdateObject(eventUuid, activePlanUuid ?? '');
  const deleteObject = useDeleteObject(eventUuid, activePlanUuid ?? '');
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

  // Auto-create a default plan if none exist
  useEffect(() => {
    if (!plansLoading && plans.length === 0 && !autoCreatedRef.current && !createPlan.isPending) {
      autoCreatedRef.current = true;
      createPlan.mutate(
        { name: 'Main Floor Plan', isDefault: true },
        {
          onSuccess: (data) => {
            if (data) setActivePlanUuid(data.uuid);
          },
        }
      );
    }
  }, [plansLoading, plans.length, createPlan]);

  // Tables only (filter out elements)
  const tables = (planDetail?.objects ?? []).filter((o) => o.objectType === 'table');

  // Collect all guests for relationships dialog
  const allGuests = [
    ...(planDetail?.objects.flatMap((o) =>
      o.assignments.map((a) => ({ uuid: a.guestUuid, firstName: a.guestFirstName, lastName: a.guestLastName }))
    ) ?? []),
    ...unassignedGuests.map((g) => ({ uuid: g.uuid, firstName: g.firstName, lastName: g.lastName })),
  ];
  const guestMap = new Map(allGuests.map((g) => [g.uuid, g]));
  const uniqueGuests = [...guestMap.values()];

  if (plansLoading || createPlan.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <AutoAssignDialog
          unassignedGuests={unassignedGuests}
          onAutoAssign={(uuids) => autoAssign.mutate(uuids)}
          isAutoAssigning={autoAssign.isPending}
        />
        <GuestRelationshipsDialog eventUuid={eventUuid} allGuests={uniqueGuests} />
      </div>

      {/* Stats */}
      <SeatingChartStats plan={planDetail} unassignedCount={unassignedGuests.length} />

      {/* Conflicts */}
      <ConflictAlerts conflicts={conflicts} />

      {/* Add table form */}
      <AddTableForm
        onAdd={(input) => createObject.mutate(input)}
        tableCount={tables.length}
        isAdding={createObject.isPending}
      />

      {/* Table grid */}
      {tables.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {tables.map((table) => (
            <TableCard
              key={table.uuid}
              object={table}
              unassignedGuests={unassignedGuests}
              onAssign={(guestUuid, seatNumber) =>
                assignGuest.mutate({
                  objectUuid: table.uuid,
                  assignments: [{ guestUuid, seatNumber }],
                })
              }
              onUnassign={(guestUuid) =>
                unassignGuest.mutate({ objectUuid: table.uuid, guestUuid })
              }
              onUpdate={(data) =>
                updateObject.mutate({ objectUuid: table.uuid, data })
              }
              onDelete={() => deleteObject.mutate(table.uuid)}
              isAssigning={assignGuest.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p className="text-sm">No tables yet. Use the form above to add your first table.</p>
        </div>
      )}
    </div>
  );
}
