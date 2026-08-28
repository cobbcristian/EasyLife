import { describe, expect, it } from "vitest";
import {
  checkoutSessionIsPaid,
  storedChargeIntentOptions,
} from "@/lib/server/settle-charge";

describe("checkoutSessionIsPaid", () => {
  it("requires payment_status paid", () => {
    expect(checkoutSessionIsPaid("paid")).toBe(true);
    expect(checkoutSessionIsPaid("unpaid")).toBe(false);
    expect(checkoutSessionIsPaid("no_payment_required")).toBe(false);
    expect(checkoutSessionIsPaid(undefined)).toBe(false);
    expect(checkoutSessionIsPaid(null)).toBe(false);
  });
});

describe("storedChargeIntentOptions", () => {
  it("embeds chargeId in metadata and return URL for SCA settle", () => {
    const opts = storedChargeIntentOptions({
      chargeId: "chg_123",
      chargeCategory: "amenity",
      appUrl: "https://app.example.com",
    });
    expect(opts.metadata).toEqual({ chargeId: "chg_123" });
    expect(opts.returnUrl).toBe(
      "https://app.example.com/member/payments?payment=success&chargeId=chg_123",
    );
  });

  it("tags HOA charges so wallet/webhook clear unit balance", () => {
    const opts = storedChargeIntentOptions({
      chargeId: "hoa_1",
      chargeCategory: "hoa",
      appUrl: "https://app.example.com/",
    });
    expect(opts.metadata).toEqual({ chargeId: "hoa_1", type: "hoa" });
  });

  it("omits charge fields when no chargeId", () => {
    const opts = storedChargeIntentOptions({
      appUrl: "https://app.example.com",
    });
    expect(opts.metadata).toEqual({});
    expect(opts.returnUrl).toBe(
      "https://app.example.com/member/payments?payment=success",
    );
  });
});
