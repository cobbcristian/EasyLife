import { describe, expect, it } from "vitest";
import { offeringOwnedByProvider } from "@/lib/server/project-management";

describe("provider offering ownership", () => {
  it("rejects missing rows and other providers", () => {
    expect(offeringOwnedByProvider(null, "a@club.com")).toBe(false);
    expect(
      offeringOwnedByProvider(
        { providerEmail: "victim@club.com" },
        "attacker@club.com",
      ),
    ).toBe(false);
  });

  it("accepts the owning provider (case-insensitive)", () => {
    expect(
      offeringOwnedByProvider(
        { providerEmail: "Pro@Club.com" },
        "pro@club.com",
      ),
    ).toBe(true);
  });
});
