import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 32 * 1024 * 1024;

/** Read SAS lifetime when the storage account blocks anonymous public access. */
const AZURE_READ_SAS_YEARS = 10;

function safeExt(name: string): string {
  const ext = path.extname(name).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
}

function parseAzureConnectionString(connectionString: string): {
  accountName: string;
  accountKey: string;
} | null {
  const parts = Object.fromEntries(
    connectionString
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf("=");
        return i === -1 ? [p, ""] : [p.slice(0, i), p.slice(i + 1)];
      }),
  ) as Record<string, string>;
  const accountName = parts.AccountName;
  const accountKey = parts.AccountKey;
  if (!accountName || !accountKey) return null;
  return { accountName, accountKey };
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
    const {
      BlobServiceClient,
      StorageSharedKeyCredential,
      BlobSASPermissions,
      generateBlobSASQueryParameters,
      SASProtocol,
    } = await import("@azure/storage-blob");
    const parsed = parseAzureConnectionString(connectionString);
    const client = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = client.getContainerClient(container);
    await containerClient.createIfNotExists();
    // Prefer public blob access when the account allows it (older configs).
    await containerClient.setAccessPolicy("blob").catch(() => {});

    const block = containerClient.getBlockBlobClient(filename);
    await block.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: contentType || "application/octet-stream",
      },
    });

    const cdn = process.env.CDN_BASE_URL?.replace(/\/$/, "");
    if (cdn) return `${cdn}/${filename}`;

    // Azure Students / secure accounts often disable anonymous access — return
    // a long-lived read SAS so gallery/avatar URLs still work in the browser.
    if (parsed) {
      const credential = new StorageSharedKeyCredential(
        parsed.accountName,
        parsed.accountKey,
      );
      const startsOn = new Date(Date.now() - 5 * 60 * 1000);
      const expiresOn = new Date(
        Date.now() + AZURE_READ_SAS_YEARS * 365 * 24 * 60 * 60 * 1000,
      );
      const sas = generateBlobSASQueryParameters(
        {
          containerName: container,
          blobName: filename,
          permissions: BlobSASPermissions.parse("r"),
          startsOn,
          expiresOn,
          protocol: SASProtocol.Https,
        },
        credential,
      ).toString();
      return `${block.url}?${sas}`;
    }

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

  const azureUrl = await saveToAzureBlob(
    filename,
    buffer,
    file.type || "application/octet-stream",
  );
  if (azureUrl) return azureUrl;

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

export async function saveUpload(
  file: File,
  opts?: { allowVideo?: boolean },
): Promise<string> {
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
