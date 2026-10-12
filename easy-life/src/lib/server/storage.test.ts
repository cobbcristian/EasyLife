import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, MAX_VIDEO_BYTES, validateMediaUpload } from "@/lib/server/storage";

describe("validateMediaUpload", () => {
  it("rejects images over 8MB", () => {
    const file = { type: "image/jpeg", size: MAX_UPLOAD_BYTES + 1 } as File;
    expect(validateMediaUpload(file)).toBe("Image too large (max 8MB)");
  });

  it("rejects videos over 32MB", () => {
    const file = { type: "video/mp4", size: MAX_VIDEO_BYTES + 1 } as File;
    expect(validateMediaUpload(file, { allowVideo: true })).toBe("Video too large (max 32MB)");
  });

  it("rejects unsupported types", () => {
    const file = { type: "application/pdf", size: 1000 } as File;
    expect(validateMediaUpload(file)).toBe("Unsupported file type");
  });

  it("accepts valid images", () => {
    const file = { type: "image/png", size: 1024 } as File;
    expect(validateMediaUpload(file)).toBeNull();
  });
});
