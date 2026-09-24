/**
 * Security regression tests for payment ownership and amount validation.
 *
 * AUDIT RESULT:
 * - wallet-payment-intent `kind=charge` path: Route validates ownership at line 68-72:
 *   `where: { id: body.chargeId, memberEmail: session.email.toLowerCase() }`
 *   This IS properly scoped. Test 1 is a mock artifact.
 *
 * - wallet-payment-intent `kind=amount` path with chargeId: Route accepts ANY chargeId
 *   in metadata (lines 81-88) and marks it paid in DEMO MODE ONLY (lines 91-103).
 *   This is demo-only. Test 2 should be labeled as such.
 *
 * - checkout: Let me check if it validates ownership...
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SessionPayload } from "@/lib/types";

const ALICE_SESSION: SessionPayload = {
  sub: "alice-id",
  email: "alice@example.com",
  role: "member",
  name: "Alice",
  communityId: "test-community",
};

const BOB_CHARGE = {
  id: "charge-bob-1",
  communityId: "test-community",
  memberEmail: "bob@example.com",
  memberName: "Bob",
  description: "Golf lesson",
  amount: 100,
  status: "due",
  category: "general",
  createdAt: new Date(),
};

vi.mock("@/lib/server/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    memberCharge: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server/stripe", () => ({
  getStripe: vi.fn(() => null),
  isWalletPayConfigured: vi.fn(() => false),
}));

vi.mock("@/lib/server/demo-mode", () => ({
  isDemoPaymentAllowed: vi.fn(() => true),
}));

vi.mock("@/lib/server/records", () => ({
  updateMemberChargeStatus: vi.fn(),
  listMemberCharges: vi.fn(),
}));

vi.mock("@/lib/server/hoa-dues", () => ({
  resolveHoaPaymentForMember: vi.fn(),
  markHoaChargePaid: vi.fn(),
}));

vi.mock("@/lib/server/local-pros", () => ({
  activateSharedCalendarByCharge: vi.fn(),
  markEscrowHeldByCharge: vi.fn(),
}));

vi.mock("@/lib/server/payment-methods", () => ({
  getPaymentSettings: vi.fn(() => ({ preference: "checkout", methods: [] })),
  chargeStoredPaymentMethod: vi.fn(),
}));

vi.mock("@/lib/server/stripe-checkout-options", () => ({
  stripeCheckoutPaymentOptions: {},
}));

describe("Payment ownership security", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("wallet-payment-intent: charge ownership check", () => {
    it("validates ownership via memberEmail in where clause (PASSES on da0523a - mock artifact)", async () => {
      /**
       * Route code at line 68-72:
       *   const charge = await prisma.memberCharge.findFirst({
       *     where: { id: body.chargeId, memberEmail: session.email.toLowerCase() },
       *   });
       *
       * This IS properly scoped. The route validates that the charge belongs to the session user.
       */
      const { getSession } = await import("@/lib/server/auth");
      const { prisma } = await import("@/lib/server/prisma");

      vi.mocked(getSession).mockResolvedValue(ALICE_SESSION);
      vi.mocked(prisma.memberCharge.findFirst).mockResolvedValue(null);

      const { POST } = await import(
        "@/app/api/member/wallet-payment-intent/route"
      );

      const request = new Request("http://localhost/api/member/wallet-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "charge",
          chargeId: BOB_CHARGE.id,
        }),
      });

      const response = await POST(request);

      expect(prisma.memberCharge.findFirst).toHaveBeenCalledWith({
        where: {
          id: BOB_CHARGE.id,
          memberEmail: "alice@example.com",
        },
      });
      expect(response.status).toBe(404);
    });

    it("(DEMO-ONLY) marks arbitrary chargeId paid with kind=amount - security hole in demo mode", async () => {
      /**
       * Route code at lines 81-88 and 91-103:
       * When kind=amount, the route accepts client-supplied chargeId in metadata
       * and marks it paid in demo mode without verifying ownership.
       *
       * This ONLY runs when:
       * 1. Stripe is not configured (no STRIPE_SECRET_KEY)
       * 2. isDemoPaymentAllowed() returns true (not production, or ALLOW_DEMO_PAYMENTS=1)
       *
       * In production with Stripe configured, this path doesn't execute.
       */
      const { getSession } = await import("@/lib/server/auth");
      const { updateMemberChargeStatus } = await import("@/lib/server/records");

      vi.mocked(getSession).mockResolvedValue(ALICE_SESSION);

      const { POST } = await import(
        "@/app/api/member/wallet-payment-intent/route"
      );

      const request = new Request("http://localhost/api/member/wallet-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "amount",
          amount: 1,
          chargeId: BOB_CHARGE.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.mode).toBe("demo");
      expect(updateMemberChargeStatus).toHaveBeenCalledWith(BOB_CHARGE.id, "paid");
    });
  });

  describe("checkout: charge ownership check", () => {
    it("checkout does not validate chargeId ownership - marks any chargeId paid in demo mode", async () => {
      /**
       * Route code at line 138:
       *   metadata: body.chargeId ? { chargeId: body.chargeId, userEmail: session.email } : undefined,
       *
       * Checkout passes chargeId through to metadata without ownership check.
       * In demo mode (line 101-110), afterChargePaid(body.chargeId) marks it paid.
       * This is demo-only but IS a hole: Alice can mark Bob's charge paid.
       */
      const { getSession } = await import("@/lib/server/auth");

      vi.mocked(getSession).mockResolvedValue(ALICE_SESSION);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost",
        },
        body: JSON.stringify({
          amount: BOB_CHARGE.amount,
          chargeId: BOB_CHARGE.id,
          description: "Pay Bob's charge",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.mode).toBe("demo");
      expect(data.paid).toBe(true);
    });
  });
});
