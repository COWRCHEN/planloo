import { Badge } from '@/components/ui/badge';

const ROLE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  owner: { label: 'Owner', variant: 'default' },
  editor: { label: 'Editor', variant: 'secondary' },
  viewer: { label: 'Viewer', variant: 'outline' },
};

interface CollaboratorRoleBadgeProps {
  role: string;
}

export function CollaboratorRoleBadge({ role }: CollaboratorRoleBadgeProps) {
  const config = ROLE_CONFIG[role] ?? { label: role, variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
