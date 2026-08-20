import { describe, expect, it } from "vitest";
import { isPosProviderEmailAllowedForCommunity } from "./pos-provider-scope";

describe("isPosProviderEmailAllowedForCommunity", () => {
  it("allows the club dining mailbox", () => {
    expect(
      isPosProviderEmailAllowedForCommunity(
        "iron-lake",
        "dining@theclubatironlake.com",
      ),
    ).toBe(true);
  });

  it("rejects another club's dining mailbox", () => {
    expect(
      isPosProviderEmailAllowedForCommunity(
        "oceanside-residents",
        "dining@theclubatironlake.com",
      ),
    ).toBe(false);
  });

  it("allows a provider email registered to the community", () => {
    expect(
      isPosProviderEmailAllowedForCommunity(
        "oceanside-residents",
        "chef@oceanside.example",
        ["chef@oceanside.example"],
      ),
    ).toBe(true);
  });

  it("rejects empty or malformed emails", () => {
    expect(isPosProviderEmailAllowedForCommunity("iron-lake", "")).toBe(false);
    expect(isPosProviderEmailAllowedForCommunity("iron-lake", "not-an-email")).toBe(
      false,
    );
  });
});
