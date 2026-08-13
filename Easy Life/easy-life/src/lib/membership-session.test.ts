import { describe, expect, it } from "vitest";
import { sessionClaimsForCommunitySwitch } from "./membership-session";

describe("sessionClaimsForCommunitySwitch", () => {
  it("uses the target membership role, not the prior session role", () => {
    const claims = sessionClaimsForCommunitySwitch(
      {
        sub: "u-pm",
        email: "pm@example.com",
        name: "Pat Manager",
      },
      {
        communityId: "club-b",
        role: "member",
      },
    );

    expect(claims).toEqual({
      sub: "u-pm",
      email: "pm@example.com",
      name: "Pat Manager",
      role: "member",
      communityId: "club-b",
    });
  });

  it("elevates when switching into a staff membership", () => {
    const claims = sessionClaimsForCommunitySwitch(
      {
        sub: "u-member",
        email: "member@example.com",
        name: "Mo Member",
      },
      {
        communityId: "club-a",
        role: "pm",
      },
    );

    expect(claims.role).toBe("pm");
    expect(claims.communityId).toBe("club-a");
  });
});
