import { apiClient } from "@/lib/apiClient";

/** Matches the API's MAX_CONTENT_LENGTH (Vercel accepts request bodies up to 4.5 MB). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,image/tiff";

/** Checked before uploading so the user gets an answer without a round trip; the API checks again. */
export function imageFileError(file: Pick<File, "type" | "size">): string | null {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return "Choose an image file: JPEG, PNG, WebP, GIF, AVIF, BMP or TIFF.";
  }
  if (file.size > MAX_UPLOAD_BYTES) return "The image is larger than 4 MB. Choose a smaller one.";
  return null;
}

/** POST one image as multipart/form-data in the field `file`. The API converts it to AVIF (R41, R42). */
export function uploadImage<T>(path: string, file: File, token: string | null): Promise<T> {
  const form = new FormData();
  form.append("file", file, file.name);
  return apiClient<T>(path, { method: "POST", token, body: form });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
