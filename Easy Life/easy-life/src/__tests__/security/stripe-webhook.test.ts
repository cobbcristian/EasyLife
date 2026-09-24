/**
 * Security regression tests for Stripe webhook payment verification.
 *
 * These tests prove that on da0523a:
 * - The webhook marks charges paid without verifying:
 *   1. The paid amount matches the charge amount
 *   2. The metadata userEmail matches the charge owner
 *
 * Route code at lines 40-52 (checkout.session.completed):
 *   const chargeId = session.metadata?.chargeId;
 *   if (chargeId) {
 *     await updateMemberChargeStatus(chargeId, "paid");
 *     // NO amount comparison: session.amount_total vs charge.amount
 *     // NO owner comparison: session.metadata.userEmail vs charge.memberEmail
 *   }
 *
 * Route code at lines 54-66 (payment_intent.succeeded):
 *   const chargeId = intent.metadata?.chargeId;
 *   if (chargeId) {
 *     await updateMemberChargeStatus(chargeId, "paid");
 *     // NO amount comparison: intent.amount vs charge.amount
 *     // NO owner comparison: intent.metadata.userEmail vs charge.memberEmail
 *   }
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const CHARGE = {
  id: "charge-1",
  communityId: "test-community",
  memberEmail: "legitimate-owner@example.com",
  memberName: "Owner",
  description: "Golf lesson",
  amount: 100,
  status: "due",
  category: "general",
  createdAt: new Date(),
};

const mockStripe = {
  webhooks: {
    constructEvent: vi.fn(),
  },
};

vi.mock("@/lib/server/stripe", () => ({
  getStripe: vi.fn(() => mockStripe),
}));

vi.mock("@/lib/server/records", () => ({
  updateMemberChargeStatus: vi.fn(),
}));

vi.mock("@/lib/server/local-pros", () => ({
  activateSharedCalendarByCharge: vi.fn(),
  markEscrowHeldByCharge: vi.fn(),
}));

vi.mock("@/lib/server/hoa-dues", () => ({
  markHoaChargePaid: vi.fn(),
}));

describe("Stripe webhook security", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("checkout.session.completed", () => {
    it("MUST NOT mark charge paid when paid amount is less than charge amount", async () => {
      /**
       * BUG: Route at lines 40-52 marks charge paid without comparing:
       *   session.amount_total (e.g., $1.00 = 100 cents)
       *   vs charge.amount (e.g., $100.00)
       *
       * An attacker could pay $1 for a $100 charge by manipulating checkout session.
       */
      const { updateMemberChargeStatus } = await import("@/lib/server/records");

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test",
            amount_total: 100,
            metadata: {
              chargeId: CHARGE.id,
              userEmail: CHARGE.memberEmail,
            },
          },
        },
      });

      const { POST } = await import("@/app/api/stripe/webhook/route");

      const request = new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "valid-sig",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(updateMemberChargeStatus).not.toHaveBeenCalled();
      expect(response.status).toBe(400);
    });

    it("MUST NOT mark charge paid when metadata userEmail doesn't match charge owner", async () => {
      /**
       * BUG: Route at lines 40-52 marks charge paid without verifying:
       *   session.metadata.userEmail === charge.memberEmail
       *
       * An attacker (eve@evil.com) could mark legitimate-owner@example.com's charge as paid.
       */
      const { updateMemberChargeStatus } = await import("@/lib/server/records");

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test",
            amount_total: 10000,
            metadata: {
              chargeId: CHARGE.id,
              userEmail: "attacker@evil.com",
            },
          },
        },
      });

      const { POST } = await import("@/app/api/stripe/webhook/route");

      const request = new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "valid-sig",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(updateMemberChargeStatus).not.toHaveBeenCalled();
      expect(response.status).toBe(400);
    });
  });

  describe("payment_intent.succeeded", () => {
    it("MUST NOT mark charge paid when paid amount is less than charge amount", async () => {
      /**
       * BUG: Route at lines 54-66 marks charge paid without comparing:
       *   intent.amount (e.g., 100 cents = $1.00)
       *   vs charge.amount (e.g., $100.00)
       */
      const { updateMemberChargeStatus } = await import("@/lib/server/records");

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test",
            amount: 100,
            metadata: {
              chargeId: CHARGE.id,
              userEmail: CHARGE.memberEmail,
            },
          },
        },
      });

      const { POST } = await import("@/app/api/stripe/webhook/route");

      const request = new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "valid-sig",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(updateMemberChargeStatus).not.toHaveBeenCalled();
      expect(response.status).toBe(400);
    });

    it("MUST NOT mark charge paid when metadata userEmail doesn't match charge owner", async () => {
      /**
       * BUG: Route at lines 54-66 marks charge paid without verifying:
       *   intent.metadata.userEmail === charge.memberEmail
       */
      const { updateMemberChargeStatus } = await import("@/lib/server/records");

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test",
            amount: 10000,
            metadata: {
              chargeId: CHARGE.id,
              userEmail: "attacker@evil.com",
            },
          },
        },
      });

      const { POST } = await import("@/app/api/stripe/webhook/route");

      const request = new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "valid-sig",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(updateMemberChargeStatus).not.toHaveBeenCalled();
      expect(response.status).toBe(400);
    });
  });
});
