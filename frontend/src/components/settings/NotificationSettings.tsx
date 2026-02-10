/**
 * Notification Settings
 *
 * Toggle controls for email notification preferences.
 */

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  type UpdateNotificationSettingsInput,
} from '@/hooks/use-notification-settings';
import { EmailHistory } from './EmailHistory';

interface SettingRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function SettingRow({ id, label, description, checked, onCheckedChange, disabled }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5 pr-4">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function NotificationSettings() {
  const { data: settings, isLoading, error } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();

  const handleToggle = (key: keyof UpdateNotificationSettingsInput) => (checked: boolean) => {
    updateSettings.mutate({ [key]: checked });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-5 w-9 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Failed to load notification settings. Please try again.
      </p>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium">Email Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Choose which emails you'd like to receive.
        </p>
      </div>

      <div>
        <SettingRow
          id="emailWelcome"
          label="Welcome email"
          description="Receive a welcome email when you sign up."
          checked={settings.emailWelcome}
          onCheckedChange={handleToggle('emailWelcome')}
        />
        <Separator />
        <SettingRow
          id="emailRsvpReceived"
          label="RSVP received"
          description="Get notified when a guest responds to your event invitation."
          checked={settings.emailRsvpReceived}
          onCheckedChange={handleToggle('emailRsvpReceived')}
        />
        <Separator />
        <SettingRow
          id="emailRsvpInvitation"
          label="RSVP invitations"
          description="Send invitation emails to guests when you share RSVP links."
          checked={settings.emailRsvpInvitation}
          onCheckedChange={handleToggle('emailRsvpInvitation')}
        />
        <Separator />
        <SettingRow
          id="emailRsvpConfirmation"
          label="RSVP confirmations"
          description="Send confirmation emails to guests after they respond."
          checked={settings.emailRsvpConfirmation}
          onCheckedChange={handleToggle('emailRsvpConfirmation')}
        />
      </div>

      <div className="rounded-md border border-muted bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Authentication emails (verification, password reset) cannot be disabled as they are required for account security.
        </p>
      </div>

      <Separator className="my-2" />

      <EmailHistory />
    </div>
  );
}
