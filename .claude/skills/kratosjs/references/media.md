# Media

Uploaded files are handled by **media adapters** registered on the panel. A `FileUpload` form field stores a media JSON object (`{ key, bucket, url }`) on the entity; adapters serve the bytes.

## Local storage

```ts
import { LocalMediaAdapter } from '@maxal_studio/kratosjs';
import path from 'path';

.mediaAdapters([
	new LocalMediaAdapter({
		name: 'local-uploads',
		uploadPath: path.join(process.cwd(), 'uploads'), // files live here on disk
		publicUrl: `http://localhost:${PORT}/uploads`,    // served at this URL
		createDirectories: true,
		isDefault: true,
	}),
])
```

Files are written under `uploadPath` and served from `publicUrl`. A stored media object's `url` = `publicUrl + '/' + key`. **The stored `key` is the source of truth** — if you seed images, copy the files under `uploadPath/<key>` or they won't resolve.

## S3

```ts
import { S3MediaAdapter } from '@maxal_studio/kratosjs';

new S3MediaAdapter({
	name: 's3',
	bucket: process.env.S3_BUCKET!,
	region: process.env.S3_REGION!,
	accessKeyId: process.env.S3_ACCESS_KEY_ID!,
	secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
	// publicUrl / endpoint as needed
	isDefault: true,
});
```

Register multiple adapters and target one from a `FileUpload` field with `.disk('s3')`. Exactly one adapter should be `isDefault: true`.

## Resolving URLs

Always resolve a media object through the panel rather than building URLs by hand:

```ts
const url = panel.resolveMediaUrl(record.image); // returns stored .url, else derives from key
```

This is what identity cells use (`references/cells.md`).

## Media hooks

Media routes are gated on write access. Lifecycle hooks (before/after upload, before/after delete, `onMediaError`) let you validate or post-process uploads via a `MediaHooks` array on the adapter/panel config. Use them for things like enforcing dimensions or logging. The logging plugin records `media.*` events.
