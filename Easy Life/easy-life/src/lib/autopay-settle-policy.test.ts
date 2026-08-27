import { describe, expect, it } from "vitest";
import { shouldSettleAutopayCharges } from "@/lib/autopay-settle-policy";

describe("shouldSettleAutopayCharges", () => {
  it("settles only when the stored-card charge reports paid", () => {
    expect(shouldSettleAutopayCharges({ status: "paid" })).toBe(true);
  });

  it("does not settle when 3DS / action_required (no capture yet)", () => {
    expect(shouldSettleAutopayCharges({ status: "action_required" })).toBe(false);
  });
});
