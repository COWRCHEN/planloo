import { Badge } from '@/components/ui/badge';

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  member: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function OrgRoleBadge({ role }: { role: string }) {
  if (!role) return null;
  return (
    <Badge variant="outline" className={roleColors[role] ?? ''}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}
