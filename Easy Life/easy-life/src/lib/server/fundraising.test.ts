import { describe, expect, it } from "vitest";
import { normalizeDonationAmount } from "@/lib/server/fundraising";

describe("normalizeDonationAmount", () => {
  it("accepts positive finite amounts rounded to cents", () => {
    expect(normalizeDonationAmount(25)).toBe(25);
    expect(normalizeDonationAmount(19.999)).toBe(20);
  });

  it("rejects non-positive, non-finite, and oversized amounts", () => {
    expect(normalizeDonationAmount(0)).toBeNull();
    expect(normalizeDonationAmount(-5)).toBeNull();
    expect(normalizeDonationAmount(Number.NaN)).toBeNull();
    expect(normalizeDonationAmount(50_000.01)).toBeNull();
  });
});
