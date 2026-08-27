import { describe, expect, it } from "vitest";

/**
 * Pure helpers mirroring the community-scope guards added for parity modules.
 * These lock the intended authorization contracts without needing a live DB.
 */

function assertSameCommunity(
  resourceCommunityId: string | null | undefined,
  sessionCommunityId: string,
): boolean {
  return Boolean(resourceCommunityId && resourceCommunityId === sessionCommunityId);
}

function nativeAppTargetCommunity(
  sessionCommunityId: string | null,
  bodyCommunityId: string,
): { ok: true; communityId: string } | { ok: false; status: 403 | 400 } {
  if (sessionCommunityId == null) {
    if (!bodyCommunityId) return { ok: false, status: 400 };
    return { ok: true, communityId: bodyCommunityId };
  }
  if (bodyCommunityId && bodyCommunityId !== sessionCommunityId) {
    return { ok: false, status: 403 };
  }
  return { ok: true, communityId: sessionCommunityId };
}

function autopayShouldSettle(result: { status: "paid" | "action_required" }) {
  return result.status === "paid";
}

describe("parity-module auth contracts", () => {
  it("rejects mutate-by-id when communities differ", () => {
    expect(assertSameCommunity("club-a", "club-b")).toBe(false);
    expect(assertSameCommunity("club-a", "club-a")).toBe(true);
    expect(assertSameCommunity(null, "club-a")).toBe(false);
  });

  it("scopes club-admin native-app writes to their community", () => {
    expect(nativeAppTargetCommunity("club-a", "club-b")).toEqual({
      ok: false,
      status: 403,
    });
    expect(nativeAppTargetCommunity("club-a", "club-a")).toEqual({
      ok: true,
      communityId: "club-a",
    });
    expect(nativeAppTargetCommunity(null, "club-b")).toEqual({
      ok: true,
      communityId: "club-b",
    });
  });

  it("does not settle autopay on action_required", () => {
    expect(autopayShouldSettle({ status: "paid" })).toBe(true);
    expect(autopayShouldSettle({ status: "action_required" })).toBe(false);
  });
});
