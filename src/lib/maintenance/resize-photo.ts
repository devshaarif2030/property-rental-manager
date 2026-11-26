/**
 * Browser only. Shrinks a phone photo to at most 1600 px on its long side and
 * re-encodes it as JPEG, so uploads stay well under the 2 MB limit and the
 * request fits in one server action body. Re-encoding also drops EXIF data,
 * including GPS location.
 */
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.82;

export async function resizePhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error("Could not encode the photo");
  const name = file.name.replace(/\.[^.]*$/, "") || "photo";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}
