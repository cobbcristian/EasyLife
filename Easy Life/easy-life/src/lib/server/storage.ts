import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const PRIVATE_DIR = path.join(process.cwd(), "private-uploads");
const PRIVATE_PREFIX = "private:";

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

function privateContainer(): string {
  return process.env.AZURE_PRIVATE_CONTAINER ?? "private-docs";
}

export function privateFileHref(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (stored.startsWith(PRIVATE_PREFIX)) {
    return `/api/files/private/${encodeURIComponent(stored.slice(PRIVATE_PREFIX.length))}`;
  }
  return stored;
}

function safePrivateName(name: string): string | null {
  if (!/^[a-z0-9]{16,64}(\.[a-z0-9]{1,5})?$/i.test(name)) return null;
  return name;
}

async function savePrivateBlob(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<boolean> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) return false;
  try {
    const { BlobServiceClient } = await import("@azure/storage-blob");
    const client = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = client.getContainerClient(privateContainer());
    await containerClient.createIfNotExists();
    const block = containerClient.getBlockBlobClient(filename);
    await block.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType || "application/octet-stream" },
    });
    return true;
  } catch {
    return false;
  }
}

function contentTypeForPrivateName(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

async function readLocalPrivateDocument(
  filename: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  try {
    const data = await fs.readFile(path.join(PRIVATE_DIR, filename));
    return { data, contentType: contentTypeForPrivateName(filename) };
  } catch {
    return null;
  }
}

export async function readPrivateDocument(
  stored: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  if (!stored.startsWith(PRIVATE_PREFIX)) return null;
  const filename = safePrivateName(stored.slice(PRIVATE_PREFIX.length));
  if (!filename) return null;

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connectionString) {
    try {
      const { BlobServiceClient } = await import("@azure/storage-blob");
      const client = BlobServiceClient.fromConnectionString(connectionString);
      const blob = client.getContainerClient(privateContainer()).getBlobClient(filename);
      if (await blob.exists()) {
        const download = await blob.download();
        const chunks: Buffer[] = [];
        if (!download.readableStreamBody) return null;
        for await (const chunk of download.readableStreamBody) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return {
          data: Buffer.concat(chunks),
          contentType: download.contentType || "application/octet-stream",
        };
      }
    } catch {
      // Fall through to local recovery for any pre-fix orphaned writes.
    }
    // Azure configured but blob missing/unreachable — recover local fallback
    // files written before fail-closed save (multi-instance still may 404).
    return readLocalPrivateDocument(filename);
  }

  return readLocalPrivateDocument(filename);
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
  const filename = `${randomBytes(16).toString("hex")}${safeExt(file.name) || ".bin"}`;
  const contentType = file.type || "application/octet-stream";
  const stored = `${PRIVATE_PREFIX}${filename}`;

  // When Azure is configured, durable private storage must succeed. Falling back
  // to local disk while AZURE_STORAGE_CONNECTION_STRING remains set leaves a
  // private: key that readPrivateDocument cannot serve from other instances
  // (and previously could not serve at all when Azure-only read returned 404).
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    const saved = await savePrivateBlob(filename, buffer, contentType);
    if (!saved) {
      throw new Error("Could not store private document");
    }
    return stored;
  }

  await fs.mkdir(PRIVATE_DIR, { recursive: true });
  await fs.writeFile(path.join(PRIVATE_DIR, filename), buffer);
  return stored;
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
