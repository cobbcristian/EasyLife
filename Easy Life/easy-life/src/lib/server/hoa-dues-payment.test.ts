import { describe, expect, it } from "vitest";
import {
  hoaCheckoutIdempotencyKey,
  hoaWalletIdempotencyKey,
} from "@/lib/server/hoa-dues";

describe("HOA payment idempotency keys", () => {
  it("are stable per charge id (prevents concurrent double Stripe charges)", () => {
    expect(hoaCheckoutIdempotencyKey("chg_1")).toBe("hoa-checkout-chg_1");
    expect(hoaCheckoutIdempotencyKey("chg_1")).toBe(hoaCheckoutIdempotencyKey("chg_1"));
    expect(hoaWalletIdempotencyKey("chg_2")).toBe("hoa-wallet-chg_2");
  });
});
