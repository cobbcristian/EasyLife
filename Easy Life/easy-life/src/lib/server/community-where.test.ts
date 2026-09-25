import { describe, expect, it } from "vitest";
import { communityWhere } from "@/lib/server/community-context";

describe("communityWhere", () => {
  it("returns a scoped filter for a real community id", () => {
    expect(communityWhere("club-a")).toEqual({ communityId: "club-a" });
  });

  it("trims whitespace before scoping", () => {
    expect(communityWhere("  club-b  ")).toEqual({ communityId: "club-b" });
  });

  it("fails closed for null, undefined, and blank (never empty object)", () => {
    expect(communityWhere(null)).toBeNull();
    expect(communityWhere(undefined)).toBeNull();
    expect(communityWhere("")).toBeNull();
    expect(communityWhere("   ")).toBeNull();
  });
});
