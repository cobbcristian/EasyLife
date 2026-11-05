import { describe, expect, it } from "vitest";
import {
  planStaffCommunityRemoval,
  providerIdsMatchingEmail,
} from "@/lib/server/account-delete-scope";

describe("providerIdsMatchingEmail", () => {
  const rows = [
    { id: "p-a", communityId: "club-a", email: "Pro@X.com" },
    { id: "p-b", communityId: "club-b", email: "pro@x.com" },
    { id: "p-other", communityId: "club-a", email: "other@x.com" },
  ];

  it("matches email case-insensitively across all clubs when unscoped", () => {
    expect(providerIdsMatchingEmail(rows, "pro@x.com")).toEqual(["p-a", "p-b"]);
  });

  it("limits deletes to one club when scoped", () => {
    expect(providerIdsMatchingEmail(rows, "pro@x.com", "club-a")).toEqual(["p-a"]);
    expect(providerIdsMatchingEmail(rows, "pro@x.com", "club-b")).toEqual(["p-b"]);
  });
});

describe("planStaffCommunityRemoval", () => {
  it("deletes the user when the removed club is their only active membership", () => {
    expect(
      planStaffCommunityRemoval({
        removeCommunityId: "club-a",
        memberships: [
          {
            id: "m1",
            communityId: "club-a",
            role: "pm",
            status: "active",
            isPrimary: true,
          },
        ],
      }),
    ).toEqual({
      revokeMembershipId: "m1",
      deleteUser: true,
      nextPrimary: null,
    });
  });

  it("keeps the user and promotes another club when multi-club", () => {
    expect(
      planStaffCommunityRemoval({
        removeCommunityId: "club-a",
        memberships: [
          {
            id: "m1",
            communityId: "club-a",
            role: "pm",
            status: "active",
            isPrimary: true,
          },
          {
            id: "m2",
            communityId: "club-b",
            role: "member",
            status: "active",
            isPrimary: false,
          },
        ],
      }),
    ).toEqual({
      revokeMembershipId: "m1",
      deleteUser: false,
      nextPrimary: { communityId: "club-b", role: "member" },
    });
  });

  it("ignores already-revoked memberships when deciding whether to delete", () => {
    expect(
      planStaffCommunityRemoval({
        removeCommunityId: "club-a",
        memberships: [
          {
            id: "m1",
            communityId: "club-a",
            role: "pm",
            status: "active",
            isPrimary: true,
          },
          {
            id: "m2",
            communityId: "club-b",
            role: "board",
            status: "revoked",
            isPrimary: false,
          },
        ],
      }).deleteUser,
    ).toBe(true);
  });
});
