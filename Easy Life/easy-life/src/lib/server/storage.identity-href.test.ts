import { describe, expect, it } from "vitest";
import { privateFileHref } from "@/lib/server/storage";

describe("privateFileHref", () => {
  it("maps private: keys to the authenticated private file route", () => {
    expect(privateFileHref("private:abcdef0123456789.pdf")).toBe(
      "/api/files/private/abcdef0123456789.pdf",
    );
  });

  it("does not emit legacy Azure SAS bearer URLs", () => {
    const sas =
      "https://acct.blob.core.windows.net/uploads/deadbeefcafe.pdf?sv=2024-01-01&sig=secret";
    const href = privateFileHref(sas);
    expect(href).toBe(`/api/files/identity?u=${encodeURIComponent(sas)}`);
    expect(href).not.toContain("sig=secret");
    expect(href?.startsWith("/api/files/identity")).toBe(true);
  });

  it("does not emit legacy /uploads public paths", () => {
    const stored = "/uploads/abcdef0123456789.png";
    expect(privateFileHref(stored)).toBe(
      `/api/files/identity?u=${encodeURIComponent(stored)}`,
    );
  });

  it("returns null for empty values", () => {
    expect(privateFileHref(null)).toBeNull();
    expect(privateFileHref(undefined)).toBeNull();
    expect(privateFileHref("")).toBeNull();
  });
});
