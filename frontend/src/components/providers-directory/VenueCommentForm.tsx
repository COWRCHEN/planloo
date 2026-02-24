import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCommentVenue } from '@/hooks/use-providers';

interface VenueCommentFormProps {
  venueUuid: string;
  userComment: string | null;
}

export function VenueCommentForm({ venueUuid, userComment }: VenueCommentFormProps) {
  const [value, setValue] = useState(userComment ?? '');
  const [saved, setSaved] = useState(false);
  const commentVenue = useCommentVenue();

  // Sync if parent data changes (e.g. after query refetch)
  useEffect(() => {
    setValue(userComment ?? '');
  }, [userComment]);

  function handleSave() {
    const trimmed = value.trim();
    commentVenue.mutate(
      { venueUuid, comment: trimmed || null },
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
    commentVenue.mutate({ venueUuid, comment: null });
  }

  const isDirty = value.trim() !== (userComment ?? '');

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Share your thoughts about this venue..."
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
              disabled={commentVenue.isPending}
              onClick={handleClear}
            >
              Clear
            </Button>
          )}
          <Button
            size="sm"
            disabled={commentVenue.isPending || !isDirty}
            onClick={handleSave}
          >
            {saved ? 'Saved!' : commentVenue.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
      {userComment && !isDirty && (
        <p className="text-xs text-muted-foreground italic">"{userComment}"</p>
      )}
    </div>
  );
}
