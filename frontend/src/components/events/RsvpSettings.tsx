/**
 * RSVP Settings Component
 *
 * Configure RSVP behavior for an event:
 * - Enable/disable RSVP
 * - Allow "Maybe" responses
 * - Set RSVP deadline
 * - Allow guests to update their RSVP
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  useRsvpSettings,
  useUpdateRsvpSettings,
  type UpdateRsvpSettingsInput,
} from '@/hooks/use-events';

interface RsvpSettingsProps {
  eventUuid: string;
}

interface SettingRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function SettingRow({ label, description, checked, onCheckedChange, disabled }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <Label className="text-base">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function RsvpSettings({ eventUuid }: RsvpSettingsProps) {
  const { data: settings, isLoading } = useRsvpSettings(eventUuid);
  const updateSettings = useUpdateRsvpSettings(eventUuid);

  const [localSettings, setLocalSettings] = useState<Partial<UpdateRsvpSettingsInput>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Reset local state when server data loads
  useEffect(() => {
    if (settings) {
      setLocalSettings({});
      setHasChanges(false);
    }
  }, [settings?.updatedAt]);

  const current = {
    enableRsvp: localSettings.enableRsvp ?? settings?.enableRsvp ?? false,
    allowMaybeResponse: localSettings.allowMaybeResponse ?? settings?.allowMaybeResponse ?? true,
    rsvpDeadline: localSettings.rsvpDeadline !== undefined
      ? localSettings.rsvpDeadline
      : settings?.rsvpDeadline ? new Date(settings.rsvpDeadline) : null,
    allowRsvpUpdate: localSettings.allowRsvpUpdate ?? settings?.allowRsvpUpdate ?? true,
    rsvpLinkExpiryHours: localSettings.rsvpLinkExpiryHours ?? settings?.rsvpLinkExpiryHours ?? 12,
  };

  const handleChange = <K extends keyof UpdateRsvpSettingsInput>(
    key: K,
    value: UpdateRsvpSettingsInput[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        enableRsvp: current.enableRsvp,
        allowMaybeResponse: current.allowMaybeResponse,
        rsvpDeadline: current.rsvpDeadline,
        allowRsvpUpdate: current.allowRsvpUpdate,
        rsvpLinkExpiryHours: current.rsvpLinkExpiryHours,
      });
      setLocalSettings({});
      setHasChanges(false);
    } catch {
      // Error handling is done in the mutation
    }
  };

  const handleReset = () => {
    setLocalSettings({});
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>RSVP & Invitations</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>RSVP & Invitations</CardTitle>
        <CardDescription>
          Configure how guests can respond to your event invitation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-0 divide-y">
          <SettingRow
            label="Enable RSVP"
            description="Allow guests to respond to your event invitation"
            checked={current.enableRsvp}
            onCheckedChange={(checked) => handleChange('enableRsvp', checked)}
            disabled={updateSettings.isPending}
          />

          {current.enableRsvp && (
            <>
              <SettingRow
                label="Allow 'Maybe' responses"
                description="Let guests respond with 'Maybe' in addition to 'Yes' and 'No'"
                checked={current.allowMaybeResponse}
                onCheckedChange={(checked) => handleChange('allowMaybeResponse', checked)}
                disabled={updateSettings.isPending}
              />

              <div className="py-3 space-y-2">
                <Label className="text-base">RSVP Deadline</Label>
                <p className="text-sm text-muted-foreground">
                  Set an optional deadline for guests to respond
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-[240px] justify-start text-left font-normal',
                          !current.rsvpDeadline && 'text-muted-foreground'
                        )}
                        disabled={updateSettings.isPending}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {current.rsvpDeadline
                          ? format(current.rsvpDeadline, 'PPP')
                          : 'No deadline set'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={current.rsvpDeadline ?? undefined}
                        onSelect={(date) => handleChange('rsvpDeadline', date ?? null)}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  {current.rsvpDeadline && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChange('rsvpDeadline', null)}
                      disabled={updateSettings.isPending}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <div className="py-3 space-y-2">
                <Label className="text-base">RSVP Link Expiry</Label>
                <p className="text-sm text-muted-foreground">
                  Set how long each invitation link remains valid after sending. Guests with expired links will need a new invitation.
                </p>
                <Select
                  value={String(current.rsvpLinkExpiryHours)}
                  onValueChange={(value) => handleChange('rsvpLinkExpiryHours', Number(value))}
                  disabled={updateSettings.isPending}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="12">12 hours (default)</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                    <SelectItem value="720">30 days</SelectItem>
                  </SelectContent>
                </Select>
                {current.rsvpDeadline && (
                  <p className="text-xs text-muted-foreground">
                    Note: If the link expiry extends past the RSVP deadline, the deadline will be used instead.
                  </p>
                )}
              </div>

              <SettingRow
                label="Allow RSVP updates"
                description="Let guests change their response after submitting"
                checked={current.allowRsvpUpdate}
                onCheckedChange={(checked) => handleChange('allowRsvpUpdate', checked)}
                disabled={updateSettings.isPending}
              />
            </>
          )}

        </div>

        {hasChanges && (
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Saving...' : 'Save changes'}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={updateSettings.isPending}>
              Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
