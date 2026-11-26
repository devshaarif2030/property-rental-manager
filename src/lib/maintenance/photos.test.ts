import { describe, expect, it } from "vitest";

import { MAX_PHOTO_BYTES, requestPhotoPath, validatePhotos } from "./photos";

const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0];
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_HEAD = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

function image(head: number[], type: string, extraBytes = 16) {
  return new File([new Uint8Array([...head, ...new Array(extraBytes).fill(0)])], "photo", { type });
}

describe("validatePhotos", () => {
  it("accepts no photos", async () => {
    expect(await validatePhotos([])).toEqual({ ok: true, photos: [] });
  });

  it("ignores empty file inputs", async () => {
    expect(await validatePhotos([new File([], "")])).toEqual({ ok: true, photos: [] });
  });

  it("accepts JPG, PNG and WebP and picks the extension from the type", async () => {
    const result = await validatePhotos([
      image(JPEG_HEAD, "image/jpeg"),
      image(PNG_HEAD, "image/png"),
      image(WEBP_HEAD, "image/webp"),
    ]);
    expect(result.ok && result.photos.map((photo) => photo.extension)).toEqual(["jpg", "png", "webp"]);
  });

  it("rejects more than three photos", async () => {
    const four = Array.from({ length: 4 }, () => image(JPEG_HEAD, "image/jpeg"));
    expect(await validatePhotos(four)).toEqual({ ok: false, error: "Add up to 3 photos." });
  });

  it("rejects a photo over 2 MB", async () => {
    expect(await validatePhotos([image(JPEG_HEAD, "image/jpeg", MAX_PHOTO_BYTES)])).toEqual({
      ok: false,
      error: "Each photo must be 2 MB or smaller.",
    });
  });

  it("rejects other types", async () => {
    expect(await validatePhotos([image([0x47, 0x49, 0x46], "image/gif")])).toEqual({
      ok: false,
      error: "Photos must be JPG, PNG or WebP.",
    });
  });

  it("rejects a file that claims to be a JPG but is not", async () => {
    expect(await validatePhotos([image([0x3c, 0x68, 0x74], "image/jpeg")])).toEqual({
      ok: false,
      error: "One of the photos is not a valid image.",
    });
  });

  it("rejects values that are not files", async () => {
    expect((await validatePhotos(["photo.jpg"])).ok).toBe(false);
  });
});

describe("requestPhotoPath", () => {
  it("puts the photo in its org and request folder", () => {
    expect(requestPhotoPath("org", "req", "file", "jpg")).toBe("org/req/file.jpg");
  });
});
