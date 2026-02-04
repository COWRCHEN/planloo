/**
 * Avatar Upload Component
 *
 * Handles avatar image upload with preview.
 */

import { useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useUploadAvatar, useDeleteAvatar } from '@/hooks/use-user';

interface AvatarUploadProps {
  currentImage?: string | null;
  name?: string | null;
  onUploadSuccess?: (url: string) => void;
}

export function AvatarUpload({ currentImage, name, onUploadSuccess }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadAvatar.mutate(file, {
      onSuccess: (response) => {
        onUploadSuccess?.(response.data.url);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      onError: () => {
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
    });
  };

  const handleRemoveAvatar = () => {
    deleteAvatar.mutate(undefined, {
      onSuccess: () => {
        setPreviewUrl(null);
      },
    });
  };

  const displayImage = previewUrl || currentImage;
  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const isLoading = uploadAvatar.isPending || deleteAvatar.isPending;

  return (
    <div className="flex items-center gap-6">
      <Avatar className="h-20 w-20">
        <AvatarImage src={displayImage || undefined} alt={name || 'Avatar'} />
        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadAvatar.isPending ? 'Uploading...' : 'Change avatar'}
          </Button>

          {currentImage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isLoading}
              onClick={handleRemoveAvatar}
            >
              {deleteAvatar.isPending ? 'Removing...' : 'Remove'}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP or GIF. Max 5MB.
        </p>

        {uploadAvatar.error && (
          <p className="text-xs text-destructive">{uploadAvatar.error.message}</p>
        )}
        {deleteAvatar.error && (
          <p className="text-xs text-destructive">{deleteAvatar.error.message}</p>
        )}
      </div>
    </div>
  );
}
