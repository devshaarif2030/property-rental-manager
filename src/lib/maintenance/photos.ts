import { z } from "zod";

/** Private bucket; photos are only ever served through short-lived signed URLs. */
export const REQUEST_PHOTOS_BUCKET = "request-photos";

/** Matches the bucket's file_size_limit. Photos are resized in the browser first. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_PHOTOS_PER_REQUEST = 3;
export const PHOTO_URL_SECONDS = 300;

const PHOTO_TYPES = {
  "image/jpeg": { extension: "jpg", signature: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": {
    extension: "png",
    signature: (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  "image/webp": {
    extension: "webp",
    // "RIFF" .... "WEBP"
    signature: (b: Uint8Array) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
} as const;

type PhotoType = keyof typeof PHOTO_TYPES;

function isPhotoType(type: string): type is PhotoType {
  return Object.hasOwn(PHOTO_TYPES, type);
}

/** Storage object name: <org_id>/<request_id>/<file_id>.<ext>, as the storage policies expect. */
export function requestPhotoPath(orgId: string, requestId: string, fileId: string, extension: string): string {
  return `${orgId}/${requestId}/${fileId}.${extension}`;
}

export type CheckedPhoto = { file: File; contentType: PhotoType; extension: string };
export type PhotosCheck = { ok: true; photos: CheckedPhoto[] } | { ok: false; error: string };

const photoListSchema = z
  .array(z.instanceof(File))
  .transform((files) => files.filter((file) => file.size > 0))
  .pipe(z.array(z.instanceof(File)).max(MAX_PHOTOS_PER_REQUEST, `Add up to ${MAX_PHOTOS_PER_REQUEST} photos.`));

/**
 * Validates photos from form data: count, size, declared type, and the file's
 * first bytes, so a renamed file is not stored as an image. No photos is fine.
 */
export async function validatePhotos(values: unknown[]): Promise<PhotosCheck> {
  const parsed = photoListSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the photos." };

  const photos: CheckedPhoto[] = [];
  for (const file of parsed.data) {
    if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "Each photo must be 2 MB or smaller." };
    if (!isPhotoType(file.type)) return { ok: false, error: "Photos must be JPG, PNG or WebP." };
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!PHOTO_TYPES[file.type].signature(head)) return { ok: false, error: "One of the photos is not a valid image." };
    photos.push({ file, contentType: file.type, extension: PHOTO_TYPES[file.type].extension });
  }
  return { ok: true, photos };
}
