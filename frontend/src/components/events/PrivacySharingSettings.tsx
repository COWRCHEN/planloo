/**
 * Privacy & Sharing Settings Component
 *
 * Configure event privacy and sharing options:
 * - Make event public/private
 * - Custom URL slug
 * - Password protection
 * - Guest list visibility
 * - Social sharing preview
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  usePrivacySettings,
  useUpdatePrivacySettings,
  useEvent,
  useUpdateEvent,
  useCheckSlug,
  type UpdatePrivacySettingsInput,
} from '@/hooks/use-events';

interface PrivacySharingSettingsProps {
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

export function PrivacySharingSettings({ eventUuid }: PrivacySharingSettingsProps) {
  const { data: privacySettings, isLoading: privacyLoading } = usePrivacySettings(eventUuid);
  const { data: event, isLoading: eventLoading } = useEvent(eventUuid);
  const updatePrivacy = useUpdatePrivacySettings(eventUuid);
  const updateEvent = useUpdateEvent(eventUuid);

  const [localPrivacy, setLocalPrivacy] = useState<Partial<UpdatePrivacySettingsInput>>({});
  const [localIsPublic, setLocalIsPublic] = useState<boolean | undefined>(undefined);
  const [localSlug, setLocalSlug] = useState<string | undefined>(undefined);
  const [hasChanges, setHasChanges] = useState(false);

  // Debounced slug for availability check
  const [debouncedSlug, setDebouncedSlug] = useState('');

  const currentSlug = localSlug ?? event?.slug ?? '';
  const currentIsPublic = localIsPublic ?? event?.isPublic ?? false;

  // Debounce slug input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSlug(currentSlug);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentSlug]);

  const { data: slugAvailable, isFetching: slugChecking } = useCheckSlug(debouncedSlug, eventUuid);

  // Determine if slug matches the currently saved slug (no check needed)
  const slugUnchanged = debouncedSlug === (event?.slug ?? '');

  // Reset local state when server data loads
  useEffect(() => {
    if (privacySettings && event) {
      setLocalPrivacy({});
      setLocalIsPublic(undefined);
      setLocalSlug(undefined);
      setHasChanges(false);
    }
  }, [privacySettings?.updatedAt, event?.updatedAt]);

  const current = {
    enablePassword: localPrivacy.enablePassword ?? privacySettings?.enablePassword ?? false,
    pagePassword: localPrivacy.pagePassword !== undefined
      ? localPrivacy.pagePassword
      : null,
    hasPassword: privacySettings?.hasPassword ?? false,
    showGuestList: localPrivacy.showGuestList ?? privacySettings?.showGuestList ?? false,
    enableSocialPreview: localPrivacy.enableSocialPreview ?? privacySettings?.enableSocialPreview ?? true,
  };

  const handlePrivacyChange = <K extends keyof UpdatePrivacySettingsInput>(
    key: K,
    value: UpdatePrivacySettingsInput[K]
  ) => {
    setLocalPrivacy((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSlugChange = useCallback((value: string) => {
    // Normalize: lowercase, replace spaces/underscores with hyphens, strip invalid chars
    const normalized = value.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
    setLocalSlug(normalized);
    setHasChanges(true);
  }, []);

  const handlePublicChange = (checked: boolean) => {
    setLocalIsPublic(checked);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Update privacy settings
      const privacyPayload: UpdatePrivacySettingsInput = {
        enablePassword: current.enablePassword,
        showGuestList: current.showGuestList,
        enableSocialPreview: current.enableSocialPreview,
      };
      // Only send pagePassword if user typed a new one
      if (localPrivacy.pagePassword !== undefined) {
        privacyPayload.pagePassword = current.pagePassword;
      }
      await updatePrivacy.mutateAsync(privacyPayload);

      // Update event fields (isPublic, slug) if changed
      const eventUpdates: Record<string, unknown> = {};
      if (localIsPublic !== undefined) eventUpdates.isPublic = currentIsPublic;
      if (localSlug !== undefined) eventUpdates.slug = currentSlug || null;

      if (Object.keys(eventUpdates).length > 0) {
        await updateEvent.mutateAsync(eventUpdates as { isPublic?: boolean; slug?: string | null });
      }

      setLocalPrivacy({});
      setLocalIsPublic(undefined);
      setLocalSlug(undefined);
      setHasChanges(false);
    } catch {
      // Error handling is done in the mutation
    }
  };

  const handleReset = () => {
    setLocalPrivacy({});
    setLocalIsPublic(undefined);
    setLocalSlug(undefined);
    setHasChanges(false);
  };

  const isLoading = privacyLoading || eventLoading;
  const isSaving = updatePrivacy.isPending || updateEvent.isPending;

  // Disable save if slug is invalid or taken
  const slugValid = !currentSlug || (currentSlug.length >= 3 && /^[a-z0-9-]+$/.test(currentSlug));
  const slugTaken = !slugUnchanged && slugAvailable === false;
  const canSave = hasChanges && slugValid && !slugTaken && !slugChecking;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Sharing</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy & Sharing</CardTitle>
        <CardDescription>
          Control who can see your event and how it appears when shared.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-0 divide-y">
          <SettingRow
            label="Make event public"
            description="Allow anyone with the link to view your event page"
            checked={currentIsPublic}
            onCheckedChange={handlePublicChange}
            disabled={isSaving}
          />

          {currentIsPublic && (
            <>
              <div className="py-3 space-y-2">
                <Label className="text-base">Custom URL slug</Label>
                <p className="text-sm text-muted-foreground">
                  Create a custom URL for your event page
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-sm text-muted-foreground shrink-0">planloo.com/rsvp/</span>
                  <Input
                    placeholder="my-event"
                    value={currentSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className={cn(
                      'max-w-[240px]',
                      slugTaken && 'border-destructive',
                      !slugUnchanged && slugAvailable === true && currentSlug.length >= 3 && 'border-green-500'
                    )}
                    maxLength={60}
                    disabled={isSaving}
                  />
                </div>
                {currentSlug && currentSlug.length > 0 && currentSlug.length < 3 && (
                  <p className="text-xs text-destructive">Slug must be at least 3 characters</p>
                )}
                {slugChecking && currentSlug.length >= 3 && !slugUnchanged && (
                  <p className="text-xs text-muted-foreground">Checking availability...</p>
                )}
                {!slugChecking && slugTaken && (
                  <p className="text-xs text-destructive">This slug is already taken</p>
                )}
                {!slugChecking && !slugUnchanged && slugAvailable === true && currentSlug.length >= 3 && (
                  <p className="text-xs text-green-600">Slug is available</p>
                )}
              </div>

              <SettingRow
                label="Require password"
                description="Visitors must enter a password to view the event page"
                checked={current.enablePassword}
                onCheckedChange={(checked) => handlePrivacyChange('enablePassword', checked)}
                disabled={isSaving}
              />

              {current.enablePassword && (
                <div className="py-3 space-y-2">
                  <Label className="text-base">Page password</Label>
                  <p className="text-sm text-muted-foreground">
                    {current.hasPassword && localPrivacy.pagePassword === undefined
                      ? 'A password is set. Enter a new value to change it.'
                      : 'Password visitors must enter to access the event page'}
                  </p>
                  <Input
                    type="text"
                    placeholder={current.hasPassword ? 'Enter new password to change' : 'Enter password'}
                    value={current.pagePassword ?? ''}
                    onChange={(e) =>
                      handlePrivacyChange('pagePassword', e.target.value || null)
                    }
                    maxLength={50}
                    className="max-w-[240px]"
                    disabled={isSaving}
                  />
                </div>
              )}

              <SettingRow
                label="Show guest list"
                description="Show the list of confirmed attendees on the event page"
                checked={current.showGuestList}
                onCheckedChange={(checked) => handlePrivacyChange('showGuestList', checked)}
                disabled={isSaving}
              />

              <SettingRow
                label="Enable social sharing preview"
                description="Show event details when the link is shared on social media"
                checked={current.enableSocialPreview}
                onCheckedChange={(checked) => handlePrivacyChange('enableSocialPreview', checked)}
                disabled={isSaving}
              />
            </>
          )}
        </div>

        {hasChanges && (
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={!canSave || isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={isSaving}>
              Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
