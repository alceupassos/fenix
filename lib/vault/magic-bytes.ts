/**
 * Content-type detection by magic bytes (not file extension).
 */

export type DetectedMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf"
  | "image/heic"
  | "application/octet-stream";

export function detectMime(buf: Buffer): DetectedMime {
  if (buf.length < 12) return "application/octet-stream";

  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";

  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";

  // PDF %PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";

  // WEBP: RIFF....WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }

  // HEIC/HEIF ftyp....
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (/heic|heif|mif1|msf1/i.test(brand)) return "image/heic";
  }

  return "application/octet-stream";
}

export const ALLOWED_VAULT_MIMES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "image/heic",
]);

export function isAllowedVaultMime(mime: string): boolean {
  return ALLOWED_VAULT_MIMES.has(mime);
}

export function extensionForMime(mime: DetectedMime): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    case "image/heic":
      return "heic";
    default:
      return "bin";
  }
}
