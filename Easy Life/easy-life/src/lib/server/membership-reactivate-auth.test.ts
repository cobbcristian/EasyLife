import { describe, expect, it } from "vitest";
import { memberInCommunityScope } from "@/lib/membership-reactivate-auth";

describe("memberInCommunityScope (reactivate authz)", () => {
  it("allows reactivation when primary community matches", () => {
    expect(
      memberInCommunityScope({
        primaryCommunityId: "oceanside-residents",
        membershipCommunityIds: [],
        communityId: "oceanside-residents",
      }),
    ).toBe(true);
  });

  it("allows reactivation via an active multi-club seat", () => {
    expect(
      memberInCommunityScope({
        primaryCommunityId: "iron-lake",
        membershipCommunityIds: ["iron-lake", "oceanside-residents"],
        communityId: "oceanside-residents",
      }),
    ).toBe(true);
  });

  it("rejects cross-tenant email reactivation", () => {
    expect(
      memberInCommunityScope({
        primaryCommunityId: "oceanside-residents",
        membershipCommunityIds: ["oceanside-residents"],
        communityId: "iron-lake",
      }),
    ).toBe(false);
  });

  it("rejects empty community scope", () => {
    expect(
      memberInCommunityScope({
        primaryCommunityId: "iron-lake",
        membershipCommunityIds: ["iron-lake"],
        communityId: "  ",
      }),
    ).toBe(false);
  });
});
