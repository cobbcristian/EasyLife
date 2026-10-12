import { describe, expect, it } from "vitest";
import {
  createAppUnlockToken,
  memberNumberFromEmail,
  parseAppUnlockToken,
} from "@/lib/server/grab-go";

describe("grab-and-go unlock", () => {
  it("derives a stable 6-digit member number", () => {
    const a = memberNumberFromEmail("sarah.mitchell@oceanside.com");
    const b = memberNumberFromEmail("sarah.mitchell@oceanside.com");
    expect(a).toBe(b);
    expect(a).toMatch(/^\d{6}$/);
  });

  it("round-trips a short-lived app unlock token", () => {
    const token = createAppUnlockToken("sarah.mitchell@oceanside.com");
    expect(parseAppUnlockToken(token)?.email).toBe("sarah.mitchell@oceanside.com");
  });
});
