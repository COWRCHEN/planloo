import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CollaboratorRoleBadge } from './CollaboratorRoleBadge';
import { InviteCollaboratorDialog } from './InviteCollaboratorDialog';
import {
  useCollaborators,
  useUpdateCollaboratorRole,
  useRemoveCollaborator,
} from '@/hooks/use-collaborators';

interface CollaboratorsListProps {
  eventUuid: string;
}

export function CollaboratorsList({ eventUuid }: CollaboratorsListProps) {
  const { data: collaborators, isLoading } = useCollaborators(eventUuid);
  const updateRole = useUpdateCollaboratorRole(eventUuid);
  const remove = useRemoveCollaborator(eventUuid);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Collaborators</CardTitle>
        <InviteCollaboratorDialog eventUuid={eventUuid} />
      </CardHeader>
      <CardContent>
        {!collaborators || collaborators.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No collaborators yet. Invite someone to help plan this event.
          </p>
        ) : (
          <div className="space-y-3">
            {collaborators.map((collab) => (
              <div
                key={collab.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {(collab.userName ?? collab.userEmail)?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{collab.userName ?? collab.userEmail}</p>
                    {collab.userName && (
                      <p className="text-xs text-muted-foreground">{collab.userEmail}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {collab.role === 'owner' ? (
                    <CollaboratorRoleBadge role="owner" />
                  ) : (
                    <>
                      <Select
                        value={collab.role}
                        onValueChange={(value) =>
                          updateRole.mutate({ collaboratorId: collab.id, role: value as 'editor' | 'viewer' })
                        }
                      >
                        <SelectTrigger className="h-8 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => remove.mutate(collab.id)}
                        disabled={remove.isPending}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
