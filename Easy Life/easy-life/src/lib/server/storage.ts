import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 32 * 1024 * 1024;

function safeExt(name: string): string {
  const ext = path.extname(name).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
}

export function validateMediaUpload(
  file: File,
  opts?: { allowVideo?: boolean },
): string | null {
  if (file.type.startsWith("image/")) {
    if (file.size > MAX_UPLOAD_BYTES) return "Image too large (max 8MB)";
    return null;
  }
  if (opts?.allowVideo && file.type.startsWith("video/")) {
    if (file.size > MAX_VIDEO_BYTES) return "Video too large (max 32MB)";
    return null;
  }
  return "Unsupported file type";
}

async function saveToAzureBlob(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string | null> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const container = process.env.AZURE_STORAGE_CONTAINER ?? "uploads";
  if (!connectionString) return null;

  try {
    const { BlobServiceClient } = await import("@azure/storage-blob");
    const client = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = client.getContainerClient(container);
    await containerClient.createIfNotExists({ access: "blob" });
    const block = containerClient.getBlockBlobClient(filename);
    await block.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType || "application/octet-stream" },
    });
    const cdn = process.env.CDN_BASE_URL?.replace(/\/$/, "");
    if (cdn) return `${cdn}/${filename}`;
    return block.url;
  } catch {
    return null;
  }
}

export function validateDocumentUpload(file: File): string | null {
  const okType =
    file.type.startsWith("image/") ||
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");
  if (!okType) return "Upload an image or PDF";
  if (file.size > MAX_UPLOAD_BYTES) return "File too large (max 8MB)";
  return null;
}

export async function saveDocumentUpload(file: File): Promise<string> {
  const validationError = validateDocumentUpload(file);
  if (validationError) throw new Error(validationError);

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${randomBytes(12).toString("hex")}${safeExt(file.name) || ".bin"}`;

  const azureUrl = await saveToAzureBlob(filename, buffer, file.type || "application/octet-stream");
  if (azureUrl) return azureUrl;

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

export async function saveUpload(file: File, opts?: { allowVideo?: boolean }): Promise<string> {
  const validationError = validateMediaUpload(file, opts);
  if (validationError) {
    throw new Error(validationError);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${randomBytes(12).toString("hex")}${safeExt(file.name)}`;

  const azureUrl = await saveToAzureBlob(filename, buffer, file.type);
  if (azureUrl) return azureUrl;

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}
