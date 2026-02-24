import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCommentProvider } from '@/hooks/use-providers';

interface ProviderCommentFormProps {
  providerUuid: string;
  userComment: string | null;
}

export function ProviderCommentForm({ providerUuid, userComment }: ProviderCommentFormProps) {
  const [value, setValue] = useState(userComment ?? '');
  const [saved, setSaved] = useState(false);
  const commentProvider = useCommentProvider();

  // Sync if parent data changes (e.g. after query refetch)
  useEffect(() => {
    setValue(userComment ?? '');
  }, [userComment]);

  function handleSave() {
    const trimmed = value.trim();
    commentProvider.mutate(
      { providerUuid, comment: trimmed || null },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  }

  function handleClear() {
    setValue('');
    commentProvider.mutate({ providerUuid, comment: null });
  }

  const isDirty = value.trim() !== (userComment ?? '');

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Share your thoughts about this provider..."
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        rows={3}
        maxLength={2000}
        className="resize-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{value.length}/2000</span>
        <div className="flex gap-2">
          {userComment && (
            <Button
              variant="ghost"
              size="sm"
              disabled={commentProvider.isPending}
              onClick={handleClear}
            >
              Clear
            </Button>
          )}
          <Button
            size="sm"
            disabled={commentProvider.isPending || !isDirty}
            onClick={handleSave}
          >
            {saved ? 'Saved!' : commentProvider.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
      {userComment && !isDirty && (
        <p className="text-xs text-muted-foreground italic">"{userComment}"</p>
      )}
    </div>
  );
}
