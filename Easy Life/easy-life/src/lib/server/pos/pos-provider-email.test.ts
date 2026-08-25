import { describe, expect, it } from "vitest";
import { allowPosProviderEmailOverride } from "./pos-provider-email";

describe("allowPosProviderEmailOverride", () => {
  it("uses the community-resolved email when no override is sent", () => {
    const result = allowPosProviderEmailOverride(
      "dining@theclubatironlake.com",
      undefined,
    );
    expect(result).toEqual({
      ok: true,
      email: "dining@theclubatironlake.com",
    });
  });

  it("allows an override that matches the club dining provider", () => {
    const result = allowPosProviderEmailOverride(
      "dining@theclubatironlake.com",
      "Dining@TheClubAtIronLake.com",
    );
    expect(result).toEqual({
      ok: true,
      email: "dining@theclubatironlake.com",
    });
  });

  it("rejects a foreign club dining email (cross-tenant write)", () => {
    const result = allowPosProviderEmailOverride(
      "dining@golfheritagebay.com",
      "dining@theclubatironlake.com",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/belong to this community/i);
    }
  });
});
