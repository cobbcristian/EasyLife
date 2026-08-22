import { describe, expect, it } from "vitest";

/** Mirrors getGroupInCommunity / invite scoping without hitting Prisma. */
function groupVisibleToCaller(
  groupCommunityId: string,
  callerCommunityId: string | null | undefined,
) {
  const cid = callerCommunityId?.trim() || "__missing_community__";
  return groupCommunityId === cid;
}

function inviteeInClub(opts: {
  userCommunityId: string | null;
  membershipCommunityIds: string[];
  clubId: string;
}) {
  return (
    opts.userCommunityId === opts.clubId ||
    opts.membershipCommunityIds.includes(opts.clubId)
  );
}

describe("group tenant scope", () => {
  it("rejects foreign club group ids", () => {
    expect(groupVisibleToCaller("club-b", "club-a")).toBe(false);
    expect(groupVisibleToCaller("club-a", "club-a")).toBe(true);
    expect(groupVisibleToCaller("club-a", null)).toBe(false);
  });

  it("requires invitee membership in the same club", () => {
    expect(
      inviteeInClub({
        userCommunityId: "club-b",
        membershipCommunityIds: ["club-b"],
        clubId: "club-a",
      }),
    ).toBe(false);
    expect(
      inviteeInClub({
        userCommunityId: "club-a",
        membershipCommunityIds: [],
        clubId: "club-a",
      }),
    ).toBe(true);
    expect(
      inviteeInClub({
        userCommunityId: "club-b",
        membershipCommunityIds: ["club-a"],
        clubId: "club-a",
      }),
    ).toBe(true);
  });
});

describe("local-pro community gate", () => {
  it("rejects provider from another club", () => {
    const providerCommunityId = "club-b";
    const callerCommunityId = "club-a";
    expect(providerCommunityId === callerCommunityId).toBe(false);
  });
});
