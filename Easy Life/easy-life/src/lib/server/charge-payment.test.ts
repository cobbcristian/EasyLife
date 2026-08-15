import { describe, expect, it } from "vitest";
import {
  canSettleChargeFromClientRedirect,
  resolveCheckoutAmount,
  webhookPaymentMatchesCharge,
} from "@/lib/server/charge-payment";

const dueCharge = {
  id: "chg_1",
  amount: 500,
  status: "due",
  memberEmail: "member@example.com",
  communityId: "oceanside",
  description: "Escrow hold",
};

describe("resolveCheckoutAmount", () => {
  it("uses DB charge amount when chargeId is present, ignoring client underpay", () => {
    const result = resolveCheckoutAmount({
      charge: dueCharge,
      chargeId: "chg_1",
      clientAmount: 0.5,
      clientDescription: "hacked",
      memberEmail: "member@example.com",
      communityId: "oceanside",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(500);
      expect(result.amountCents).toBe(50000);
      expect(result.description).toBe("Escrow hold");
      expect(result.chargeId).toBe("chg_1");
    }
  });

  it("rejects charge owned by another member", () => {
    const result = resolveCheckoutAmount({
      charge: dueCharge,
      chargeId: "chg_1",
      clientAmount: 500,
      memberEmail: "attacker@example.com",
      communityId: "oceanside",
    });
    expect(result).toEqual({ ok: false, error: "Charge not found", status: 404 });
  });

  it("rejects missing charge for chargeId", () => {
    const result = resolveCheckoutAmount({
      charge: null,
      chargeId: "missing",
      clientAmount: 10,
      memberEmail: "member@example.com",
    });
    expect(result).toEqual({ ok: false, error: "Charge not found", status: 404 });
  });

  it("rejects already-paid charge", () => {
    const result = resolveCheckoutAmount({
      charge: { ...dueCharge, status: "paid" },
      chargeId: "chg_1",
      clientAmount: 500,
      memberEmail: "member@example.com",
    });
    expect(result).toEqual({ ok: false, error: "Charge already paid", status: 409 });
  });

  it("allows ad-hoc checkout without chargeId using client amount", () => {
    const result = resolveCheckoutAmount({
      charge: null,
      clientAmount: 25,
      clientDescription: "Clinic fee",
      memberEmail: "member@example.com",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(25);
      expect(result.amountCents).toBe(2500);
      expect(result.chargeId).toBeUndefined();
    }
  });
});

describe("canSettleChargeFromClientRedirect", () => {
  it("never settles from client redirect when Stripe is configured", () => {
    expect(
      canSettleChargeFromClientRedirect({
        stripeConfigured: true,
        demoPaymentsAllowed: true,
      }),
    ).toBe(false);
  });

  it("allows demo settle only when Stripe is off and demo payments allowed", () => {
    expect(
      canSettleChargeFromClientRedirect({
        stripeConfigured: false,
        demoPaymentsAllowed: true,
      }),
    ).toBe(true);
    expect(
      canSettleChargeFromClientRedirect({
        stripeConfigured: false,
        demoPaymentsAllowed: false,
      }),
    ).toBe(false);
  });
});

describe("webhookPaymentMatchesCharge", () => {
  it("accepts matching amount_total and metadata amountCents", () => {
    expect(
      webhookPaymentMatchesCharge({
        amountTotal: 50000,
        metadataAmountCents: "50000",
      }),
    ).toBe(true);
  });

  it("rejects underpayment vs metadata", () => {
    expect(
      webhookPaymentMatchesCharge({
        amountTotal: 50,
        metadataAmountCents: "50000",
      }),
    ).toBe(false);
  });

  it("allows legacy sessions without amountCents metadata", () => {
    expect(
      webhookPaymentMatchesCharge({
        amountTotal: 50,
        metadataAmountCents: undefined,
      }),
    ).toBe(true);
  });
});
