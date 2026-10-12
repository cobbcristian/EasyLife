import { describe, expect, it } from "vitest";
import {
  addressesMatch,
  ageInYears,
  birthdayOnAge,
  evaluateDependentEligibility,
  noticeMessage,
} from "@/lib/dependent-membership";

describe("dependent membership", () => {
  it("computes age from DOB", () => {
    expect(ageInYears("2000-07-18", new Date(2026, 6, 18))).toBe(26);
    expect(ageInYears("2000-07-19", new Date(2026, 6, 18))).toBe(25);
  });

  it("builds age-out birthday", () => {
    expect(birthdayOnAge("2001-03-15", 25)).toBe("2026-03-15");
  });

  it("matches household addresses loosely", () => {
    expect(
      addressesMatch(
        "204B Magnolia Lane, Golden Ocala",
        "204B Magnolia Lane, Golden Ocala",
      ),
    ).toBe(true);
    expect(
      addressesMatch("204B Apt. Magnolia Lane", "204B Magnolia Lane"),
    ).toBe(true);
    expect(addressesMatch("99 Other St", "1 Club Dr")).toBe(false);
  });

  it("warns before age-out", () => {
    const result = evaluateDependentEligibility({
      dateOfBirth: "2001-09-01",
      householdAddress: "1 Club Dr",
      sponsorAddress: "1 Club Dr",
      ageOutYears: 25,
      requireSameAddress: true,
      warnDaysBefore: 90,
      asOf: new Date(2026, 6, 18),
    });
    expect(result.age).toBe(24);
    expect(result.withinWarnWindow).toBe(true);
    expect(result.pastDue).toBe(false);
    expect(result.suggestedStatus).toBe("warned");
    expect(result.reason).toBe("age");
  });

  it("requires convert after age-out", () => {
    const result = evaluateDependentEligibility({
      dateOfBirth: "2000-01-01",
      householdAddress: "1 Club Dr",
      sponsorAddress: "1 Club Dr",
      ageOutYears: 25,
      requireSameAddress: true,
      warnDaysBefore: 90,
      asOf: new Date(2026, 6, 18),
    });
    expect(result.pastDue).toBe(true);
    expect(result.suggestedStatus).toBe("must_convert");
  });

  it("flags address mismatch immediately", () => {
    const result = evaluateDependentEligibility({
      dateOfBirth: "2010-01-01",
      householdAddress: "99 Other St",
      sponsorAddress: "1 Club Dr",
      ageOutYears: 25,
      requireSameAddress: true,
      warnDaysBefore: 90,
      asOf: new Date(2026, 6, 18),
    });
    expect(result.addressOk).toBe(false);
    expect(result.reason).toBe("address");
    expect(result.pastDue).toBe(true);
    expect(result.suggestedStatus).toBe("must_convert");
  });

  it("writes clear notice copy", () => {
    const msg = noticeMessage({
      dependentName: "Alex Mitchell",
      ageOutYears: 25,
      reason: "age",
      level: "warning",
      dueDate: "2026-09-01",
      daysLeft: 45,
    });
    expect(msg).toContain("Alex Mitchell");
    expect(msg).toContain("25");
    expect(msg).toContain("45 days");
  });
});
