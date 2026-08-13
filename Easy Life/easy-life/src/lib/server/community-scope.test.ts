import { describe, expect, it } from "vitest";
import { canUseActiveCommunityCookie } from "./community-scope";

describe("canUseActiveCommunityCookie", () => {
  it("allows member sessions with a member seat", () => {
    expect(
      canUseActiveCommunityCookie({
        sessionRole: "member",
        membershipRole: "member",
      }),
    ).toBe(true);
  });

  it("blocks club admin JWT from scoping into a member-only seat", () => {
    expect(
      canUseActiveCommunityCookie({
        sessionRole: "admin",
        membershipRole: "member",
      }),
    ).toBe(false);
  });

  it("allows club admin JWT when membership is also admin", () => {
    expect(
      canUseActiveCommunityCookie({
        sessionRole: "admin",
        membershipRole: "admin",
      }),
    ).toBe(true);
  });

  it("blocks pm JWT from scoping into a member-only seat", () => {
    expect(
      canUseActiveCommunityCookie({
        sessionRole: "pm",
        membershipRole: "member",
      }),
    ).toBe(false);
  });

  it("rejects missing membership", () => {
    expect(
      canUseActiveCommunityCookie({
        sessionRole: "admin",
        membershipRole: null,
      }),
    ).toBe(false);
  });
});
