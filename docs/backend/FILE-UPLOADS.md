# File Uploads (R2 Storage)

This document explains how file uploads work in Planloo, including avatar uploads and the R2 storage configuration.

## Overview

Planloo uses Cloudflare R2 for file storage. Files are uploaded via the backend API and served through a proxy endpoint (when `R2_PUBLIC_URL` is not configured) or directly from R2 (when a public bucket URL is set).

## R2 Bucket Setup

### 1. Create the R2 Bucket

```bash
# For development
wrangler r2 bucket create planloo-uploads-dev

# For staging
wrangler r2 bucket create planloo-uploads-staging

# For production
wrangler r2 bucket create planloo-uploads
```

### 2. Configure wrangler.toml

Add the R2 bucket binding to your environment:

```toml
# Development
[[env.development.r2_buckets]]
binding = "UPLOADS_BUCKET"
bucket_name = "planloo-uploads-dev"
preview_bucket_name = "planloo-uploads-dev"  # Required for wrangler dev
```

**Important**: The `preview_bucket_name` is required for local development with `wrangler dev`.

### 3. Optional: Set R2_PUBLIC_URL

If you have a custom domain for your R2 bucket (for direct public access), set it as a secret:

```bash
wrangler secret put R2_PUBLIC_URL --env development
# Enter: https://uploads.yourdomain.com
```

If not set, files are served through the API proxy endpoint.

## API Endpoints

### Upload Avatar
```
POST /api/v1/uploads/avatar
Content-Type: multipart/form-data

Body: file (image file)
```

**Supported formats**: JPEG, PNG, WebP, GIF  
**Max size**: 5MB

**Response**:
```json
{
  "success": true,
  "data": {
    "url": "http://localhost:8787/api/v1/uploads/files/avatars/{userId}/{timestamp}.webp",
    "key": "avatars/{userId}/{timestamp}.webp"
  }
}
```

### Delete Avatar
```
DELETE /api/v1/uploads/avatar
```

### Serve Files (Proxy)
```
GET /api/v1/uploads/files/{key}
```

This endpoint serves files from R2 when `R2_PUBLIC_URL` is not configured.

## Local Development Notes

### Wrangler Dev Behavior

When running `wrangler dev`, be aware of these behaviors:

1. **R2 connects to real Cloudflare storage**: Even in local dev, R2 bucket operations go to your actual Cloudflare R2 bucket. Use a separate dev bucket (`planloo-uploads-dev`) to avoid affecting production data.

2. **URL rewriting**: Wrangler dev rewrites `c.req.url` and the `Host` header to the workers.dev URL. The code handles this by checking `ENVIRONMENT === 'development'` and using `localhost:8787` for file URLs.

3. **CORS and CORP headers**: The file serving endpoint needs special header configuration (see below).

### Cross-Origin Resource Policy (CORP)

The `secureHeaders()` middleware sets `Cross-Origin-Resource-Policy: same-origin` by default, which blocks images from being loaded by a different origin (frontend on :4321, backend on :8787).

**Solution**: Configure permissive CORP for the file serving endpoint:

```typescript
// In src/index.ts
app.use('/api/v1/uploads/files/*', secureHeaders({
  crossOriginResourcePolicy: 'cross-origin',
}));

app.use('*', secureHeaders());
```

## Troubleshooting

### 503 Service Unavailable on Upload

**Cause**: R2 bucket not configured in wrangler.toml

**Solution**: 
1. Create the R2 bucket: `wrangler r2 bucket create planloo-uploads-dev`
2. Uncomment/add the R2 binding in wrangler.toml
3. Add `preview_bucket_name` for local dev

### 404 Not Found When Loading Image

**Possible causes**:
1. File key mismatch between upload and retrieval
2. File uploaded to different bucket than being read from
3. Stale URL in session cache

**Debug**: Check backend logs for the extracted key:
```
[GET files] rawPath: /api/v1/uploads/files/avatars/...
[GET files] extracted key: avatars/...
```

### Image Loads (200 OK) But Doesn't Display

**Cause**: `Cross-Origin-Resource-Policy: same-origin` header blocking cross-origin image use

**Solution**: See CORP configuration above

### Avatar Not Updating After Upload

**Cause**: Better Auth session cookie caching (5 minutes)

**Solution**: The frontend optimistically updates the session cache after upload:

```typescript
// In useUploadAvatar hook
onSuccess: (data) => {
  queryClient.setQueryData(authKeys.session(), (oldData) => ({
    ...oldData,
    user: { ...oldData.user, image: data.data.url },
  }));
}
```

## File Storage Structure

```
planloo-uploads-dev/
└── avatars/
    └── {userId}/
        └── {timestamp}.{ext}
```

## Security Considerations

1. **Authentication**: Upload/delete endpoints require authentication (`requireAuth` middleware)
2. **Email verification**: Avatar upload requires verified email (`requireVerifiedEmail` middleware)
3. **File validation**: Only allowed image types (JPEG, PNG, WebP, GIF) up to 5MB
4. **Soft delete**: When deleting avatars, only files in the `avatars/` prefix are deleted from R2
