/**
 * Settings View
 *
 * Main settings page with tabs for profile and security.
 * Wraps settings components with QueryProvider.
 */

import { QueryProvider } from '@/components/providers/QueryProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ProfileEditForm } from './ProfileEditForm';
import { PasswordChangeForm } from './PasswordChangeForm';
import { useSession } from '@/hooks/use-auth';

function SettingsContent() {
  const { data: session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to access settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card>
          <CardContent className="pt-6">
            <ProfileEditForm user={session.user} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        <Card>
          <CardContent className="pt-6">
            <PasswordChangeForm />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export function SettingsView() {
  return (
    <QueryProvider>
      <SettingsContent />
    </QueryProvider>
  );
}
