import { describe, expect, it } from "vitest";
import {
  createAppUnlockToken,
  memberNumberFromEmail,
  parseAppUnlockToken,
} from "./grab-go";

describe("grab-and-go unlock", () => {
  it("derives a stable 6-digit member number", () => {
    const a = memberNumberFromEmail("sarah.mitchell@oceanside.com");
    const b = memberNumberFromEmail("sarah.mitchell@oceanside.com");
    expect(a).toBe(b);
    expect(a).toMatch(/^\d{6}$/);
  });

  it("round-trips a short-lived HMAC-signed app unlock token", () => {
    const token = createAppUnlockToken("sarah.mitchell@oceanside.com");
    expect(token).toContain(".");
    expect(parseAppUnlockToken(token)?.email).toBe(
      "sarah.mitchell@oceanside.com",
    );
  });

  it("rejects unsigned base64 forge of another member email", () => {
    const forged = Buffer.from(
      `victim@club.com:${Date.now()}:deadbeef`,
    ).toString("base64url");
    expect(parseAppUnlockToken(forged)).toBeNull();
  });

  it("rejects tampered signature", () => {
    const token = createAppUnlockToken("sarah.mitchell@oceanside.com");
    const [body] = token.split(".");
    expect(parseAppUnlockToken(`${body}.AAAAAAAAAAAAAAAAAAAAAA`)).toBeNull();
  });
});
