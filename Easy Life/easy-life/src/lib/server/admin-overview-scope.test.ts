import { describe, expect, it } from "vitest";
import { adminOverviewCommunityScope } from "@/lib/server/admin-overview-scope";

describe("adminOverviewCommunityScope", () => {
  it("lets platform super admins see all communities", () => {
    expect(
      adminOverviewCommunityScope({ role: "admin", communityId: null }),
    ).toBeNull();
  });

  it("scopes club admins to their own community", () => {
    expect(
      adminOverviewCommunityScope({
        role: "admin",
        communityId: "oceanside-residents",
      }),
    ).toBe("oceanside-residents");
  });

  it("does not grant global overview to non-admin roles", () => {
    expect(
      adminOverviewCommunityScope({ role: "pm", communityId: "iron-lake" }),
    ).toBe("__no_community__");
  });
});
