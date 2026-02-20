/**
 * Uploads Routes
 *
 * Handles file uploads to Cloudflare R2.
 */

import { Hono } from 'hono';
import type { HonoEnv } from '@/types/env';
import { requireAuth, requireVerifiedEmail } from '@/middleware/auth';
import { createDbClient } from '@/db/client';
import { schema } from '@/db';
import { eq } from 'drizzle-orm';

const uploads = new Hono<HonoEnv>();

// Allowed image types and max size
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Verify that file content matches declared MIME type via magic bytes.
 */
function verifyImageMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12) return false;

  switch (mimeType) {
    case 'image/jpeg':
      return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    case 'image/png':
      return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    case 'image/gif':
      return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
    case 'image/webp':
      return (
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
      );
    default:
      return false;
  }
}

/**
 * Extract R2 key from avatar URL
 * Handles both R2_PUBLIC_URL format and API proxy format
 */
function extractAvatarKey(imageUrl: string, r2PublicUrl?: string): string | null {
  let key = imageUrl;

  // Handle R2_PUBLIC_URL format: {R2_PUBLIC_URL}/avatars/...
  if (r2PublicUrl && key.startsWith(r2PublicUrl)) {
    key = key.slice(r2PublicUrl.length + 1); // +1 for the slash
  }

  // Handle API proxy format: http://host/api/v1/uploads/files/avatars/...
  const apiPrefix = '/api/v1/uploads/files/';
  const apiIndex = key.indexOf(apiPrefix);
  if (apiIndex !== -1) {
    key = key.substring(apiIndex + apiPrefix.length);
  }

  // Validate it's an avatar key
  if (key.startsWith('avatars/')) {
    return key;
  }

  return null;
}

/**
 * Delete avatar from R2 bucket
 */
async function deleteAvatarFromBucket(
  bucket: R2Bucket,
  imageUrl: string,
  r2PublicUrl?: string
): Promise<boolean> {
  const key = extractAvatarKey(imageUrl, r2PublicUrl);

  if (!key) {
    console.warn('Could not extract avatar key from URL:', imageUrl);
    return false;
  }

  try {
    console.log('Deleting avatar from R2:', key);
    await bucket.delete(key);
    console.log('Successfully deleted avatar from R2:', key);
    return true;
  } catch (error) {
    console.error('Failed to delete avatar from R2:', key, error);
    return false;
  }
}

/**
 * Helper to build the public URL for an uploaded file
 */
function buildFileUrl(
  c: { 
    req: { url: string; header: (name: string) => string | undefined }; 
    env: { R2_PUBLIC_URL?: string; ENVIRONMENT?: string } 
  },
  key: string
): string {
  const publicUrl = c.env.R2_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl}/${key}`;
  }
  
  // In development, wrangler rewrites Host header to workers.dev URL
  // Use localhost directly for local development
  if (c.env.ENVIRONMENT === 'development') {
    return `http://localhost:8787/api/v1/uploads/files/${key}`;
  }
  
  // For staging/production, use the Host header
  const host = c.req.header('host');
  const protocol = 'https';
  const origin = host ? `${protocol}://${host}` : new URL(c.req.url).origin;
  
  return `${origin}/api/v1/uploads/files/${key}`;
}

/**
 * GET /uploads/files/*
 * Serve files from R2 bucket (used when R2_PUBLIC_URL is not configured)
 */
uploads.get('/files/*', async (c) => {
  const bucket = c.env.UPLOADS_BUCKET;

  if (!bucket) {
    return c.json(
      {
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'File storage is not configured',
        },
      },
      503
    );
  }

  // Extract the file key from the URL path
  const key = c.req.path.replace('/api/v1/uploads/files/', '');

  if (!key) {
    return c.json(
      {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'No file key provided',
        },
      },
      400
    );
  }

  try {
    const object = await bucket.get(key);

    if (!object) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'File not found',
          },
        },
        404
      );
    }

    // Return the file with proper headers including CORS
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', object.etag);
    
    // Allow cross-origin resource sharing for images
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    const origin = c.req.header('origin');
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin);
    }

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Failed to serve file:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve file',
        },
      },
      500
    );
  }
});

/**
 * POST /uploads/avatar
 * Upload user avatar image
 */
uploads.post('/avatar', requireAuth, requireVerifiedEmail, async (c) => {
  const bucket = c.env.UPLOADS_BUCKET;

  if (!bucket) {
    return c.json(
      {
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'File uploads are not configured',
        },
      },
      503
    );
  }

  const user = c.get('user')!;

  // Parse multipart form data
  const formData = await c.req.formData().catch(() => null);

  if (!formData) {
    return c.json(
      {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid form data',
        },
      },
      400
    );
  }

  const file = formData.get('file') as File | null;

  if (!file || typeof file === 'string') {
    return c.json(
      {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'No file provided',
        },
      },
      400
    );
  }

  // Validate file type
  const fileType = file.type;
  if (!ALLOWED_TYPES.includes(fileType)) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
        },
      },
      400
    );
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    return c.json(
      {
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File too large. Maximum size: ${MAX_SIZE / (1024 * 1024)}MB`,
        },
      },
      400
    );
  }

  // Generate storage key
  const ext = file.type.split('/')[1];
  const timestamp = Date.now();
  const key = `avatars/${user.id}/${timestamp}.${ext}`;

  try {
    // Delete old avatar if exists (to avoid orphaned files in R2)
    const db = createDbClient(c.env.DB);
    const [currentUser] = await db
      .select({ image: schema.user.image })
      .from(schema.user)
      .where(eq(schema.user.id, user.id))
      .limit(1);

    if (currentUser?.image) {
      await deleteAvatarFromBucket(bucket, currentUser.image, c.env.R2_PUBLIC_URL);
    }

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();

    // Verify magic bytes match declared MIME type
    if (!verifyImageMagicBytes(arrayBuffer, fileType)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_CONTENT',
            message: 'File content does not match declared image type',
          },
        },
        400
      );
    }

    await bucket.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Build the public URL (uses R2_PUBLIC_URL if set, otherwise API proxy endpoint)
    const url = buildFileUrl(c, key);

    // Update user's image in database
    await db
      .update(schema.user)
      .set({
        image: url,
        updatedAt: new Date(),
      })
      .where(eq(schema.user.id, user.id));

    return c.json({
      success: true,
      data: {
        url,
        key,
      },
    });
  } catch (error) {
    console.error('Failed to upload avatar:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload file',
        },
      },
      500
    );
  }
});

/**
 * DELETE /uploads/avatar
 * Delete user's current avatar
 */
uploads.delete('/avatar', requireAuth, async (c) => {
  const bucket = c.env.UPLOADS_BUCKET;
  const user = c.get('user')!;

  if (!bucket) {
    return c.json(
      {
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'File uploads are not configured',
        },
      },
      503
    );
  }

  // Get user's current image to find the key
  const db = createDbClient(c.env.DB);
  const [currentUser] = await db
    .select({ image: schema.user.image })
    .from(schema.user)
    .where(eq(schema.user.id, user.id))
    .limit(1);

  if (currentUser?.image) {
    const deleted = await deleteAvatarFromBucket(
      bucket,
      currentUser.image,
      c.env.R2_PUBLIC_URL
    );
    if (!deleted) {
      console.warn('Avatar deletion from R2 failed or was skipped for:', currentUser.image);
    }
  } else {
    console.log('No avatar to delete for user:', user.id);
  }

  // Clear image in database
  await db
    .update(schema.user)
    .set({
      image: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.user.id, user.id));

  return c.json({
    success: true,
    data: null,
  });
});

export default uploads;
