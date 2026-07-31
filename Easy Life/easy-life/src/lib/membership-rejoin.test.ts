import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  evaluateRejoinEligibility,
  rejoinWaitMessage,
} from "@/lib/membership-rejoin";

describe("membership rejoin wait", () => {
  it("adds wait days from resignation", () => {
    expect(addDaysIso(new Date(2025, 6, 18), 365)).toBe("2026-07-18");
  });

  it("blocks rejoin while waiting", () => {
    const result = evaluateRejoinEligibility({
      policyEnabled: true,
      waitDays: 365,
      resignedAt: new Date(2025, 6, 18),
      rejoinEligibleOn: "2026-07-18",
      asOf: new Date(2026, 5, 18),
    });
    expect(result.waiting).toBe(true);
    expect(result.eligible).toBe(false);
    expect(result.daysRemaining).toBe(30);
  });

  it("allows rejoin after wait", () => {
    const result = evaluateRejoinEligibility({
      policyEnabled: true,
      waitDays: 365,
      rejoinEligibleOn: "2026-07-01",
      asOf: new Date(2026, 6, 18),
    });
    expect(result.eligible).toBe(true);
    expect(result.waiting).toBe(false);
  });

  it("skips wait when club disables policy", () => {
    const result = evaluateRejoinEligibility({
      policyEnabled: false,
      waitDays: 365,
      rejoinEligibleOn: "2027-01-01",
      asOf: new Date(2026, 6, 18),
    });
    expect(result.eligible).toBe(true);
    expect(result.waiting).toBe(false);
  });

  it("writes staff wait-time copy", () => {
    const msg = rejoinWaitMessage({
      memberName: "Jordan Hayes",
      waitDays: 365,
      daysRemaining: 65,
      eligibleOn: "2026-09-21",
      forStaff: true,
    });
    expect(msg).toContain("Jordan Hayes");
    expect(msg).toContain("65 day");
    expect(msg).toContain("2026-09-21");
  });
});
