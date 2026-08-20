import { describe, expect, it } from "vitest";
import { canMutateCommunityResource } from "@/lib/server/community-resource-scope";

describe("canMutateCommunityResource", () => {
  it("allows super-admin sessions with no community", () => {
    expect(canMutateCommunityResource(null, "club-b")).toBe(true);
    expect(canMutateCommunityResource(undefined, "club-b")).toBe(true);
  });

  it("allows club staff only for their own community", () => {
    expect(canMutateCommunityResource("club-a", "club-a")).toBe(true);
    expect(canMutateCommunityResource("club-a", "club-b")).toBe(false);
  });
});
