import { describe, expect, it } from "vitest";
import {
  MEMBERSHIP_NOT_RENEWED_MESSAGE,
  isMembershipDeactivated,
  isMembershipPrivileged,
  normalizeMembershipStatus,
} from "@/lib/membership-status";

describe("membership deactivation", () => {
  it("flags deactivated accounts", () => {
    expect(isMembershipDeactivated("deactivated")).toBe(true);
    expect(isMembershipDeactivated("active")).toBe(false);
    expect(isMembershipDeactivated("resigned")).toBe(false);
  });

  it("only active accounts keep privileges", () => {
    expect(isMembershipPrivileged("active")).toBe(true);
    expect(isMembershipPrivileged(null)).toBe(true);
    expect(isMembershipPrivileged("deactivated")).toBe(false);
    expect(isMembershipPrivileged("resigned")).toBe(false);
  });

  it("normalizes unknown status to active", () => {
    expect(normalizeMembershipStatus("deactivated")).toBe("deactivated");
    expect(normalizeMembershipStatus("resigned")).toBe("resigned");
    expect(normalizeMembershipStatus("weird")).toBe("active");
  });

  it("exposes clear non-renewal copy for login / portal gates", () => {
    expect(MEMBERSHIP_NOT_RENEWED_MESSAGE).toContain("not been renewed");
    expect(MEMBERSHIP_NOT_RENEWED_MESSAGE).toContain("Contact Membership");
  });
});
