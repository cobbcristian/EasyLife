import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

const PRIVATE_DIR = path.join(process.cwd(), "private-uploads");

describe("private document storage", () => {
  const prevAzure = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const leftovers: string[] = [];

  beforeEach(() => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    vi.resetModules();
  });

  afterEach(async () => {
    if (prevAzure === undefined) {
      delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    } else {
      process.env.AZURE_STORAGE_CONNECTION_STRING = prevAzure;
    }
    for (const name of leftovers.splice(0)) {
      await fs.unlink(path.join(PRIVATE_DIR, name)).catch(() => undefined);
    }
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("writes and reads locally when Azure is not configured", async () => {
    const { saveDocumentUpload, readPrivateDocument } = await import("@/lib/server/storage");
    const bytes = Buffer.from("gov-id-fixture");
    const file = {
      name: "id.png",
      type: "image/png",
      size: bytes.length,
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    } as File;

    const stored = await saveDocumentUpload(file);
    expect(stored.startsWith("private:")).toBe(true);
    leftovers.push(stored.slice("private:".length));

    const read = await readPrivateDocument(stored);
    expect(read?.contentType).toBe("image/png");
    expect(read?.data.toString()).toBe("gov-id-fixture");
  });

  it("fails closed when Azure is configured but private blob upload fails", async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING =
      "DefaultEndpointsProtocol=https;AccountName=test;AccountKey=dGVzdA==;EndpointSuffix=core.windows.net";

    vi.doMock("@azure/storage-blob", () => ({
      BlobServiceClient: {
        fromConnectionString: () => ({
          getContainerClient: () => ({
            createIfNotExists: async () => {
              throw new Error("container denied");
            },
            getBlockBlobClient: () => ({
              uploadData: async () => {
                throw new Error("upload denied");
              },
            }),
            getBlobClient: () => ({
              exists: async () => false,
            }),
          }),
        }),
      },
    }));

    const { saveDocumentUpload } = await import("@/lib/server/storage");
    const bytes = Buffer.from("should-not-land-locally");
    const file = {
      name: "id.pdf",
      type: "application/pdf",
      size: bytes.length,
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    } as File;

    await expect(saveDocumentUpload(file)).rejects.toThrow("Could not store private document");
  });

  it("recovers local private files when Azure blob is missing", async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING =
      "DefaultEndpointsProtocol=https;AccountName=test;AccountKey=dGVzdA==;EndpointSuffix=core.windows.net";

    vi.doMock("@azure/storage-blob", () => ({
      BlobServiceClient: {
        fromConnectionString: () => ({
          getContainerClient: () => ({
            createIfNotExists: async () => undefined,
            getBlobClient: () => ({
              exists: async () => false,
            }),
          }),
        }),
      },
    }));

    const filename = `${randomBytes(16).toString("hex")}.png`;
    leftovers.push(filename);
    await fs.mkdir(PRIVATE_DIR, { recursive: true });
    await fs.writeFile(path.join(PRIVATE_DIR, filename), Buffer.from("orphan-local"));

    const { readPrivateDocument } = await import("@/lib/server/storage");
    const read = await readPrivateDocument(`private:${filename}`);
    expect(read?.data.toString()).toBe("orphan-local");
    expect(read?.contentType).toBe("image/png");
  });
});
