import { describe, expect, it } from "vitest";
import { fundraisingCountsTowardRaised } from "@/lib/fundraising-donate-policy";

describe("fundraisingCountsTowardRaised", () => {
  it("does not count unpaid due charges", () => {
    expect(fundraisingCountsTowardRaised({ chargeStatus: "due" })).toBe(false);
    expect(fundraisingCountsTowardRaised({ chargeStatus: null })).toBe(false);
  });

  it("counts only after the linked charge is paid", () => {
    expect(fundraisingCountsTowardRaised({ chargeStatus: "paid" })).toBe(true);
  });
});
