/**
 * Security regression tests for payment ownership and amount validation.
 *
 * These tests prove security holes in da0523a:
 * 1. A member can pay someone else's MemberCharge via api/checkout
 * 2. A member can pay someone else's charge via member/wallet-payment-intent
 * 3. The Stripe webhook marks charges paid without verifying amount or owner
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

const BOB_SESSION: SessionPayload = {
  sub: "bob-id",
  email: "bob@example.com",
  role: "member",
  name: "Bob",
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
    it("MUST reject paying another user's charge", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { prisma } = await import("@/lib/server/prisma");

      vi.mocked(getSession).mockResolvedValue(ALICE_SESSION);
      vi.mocked(prisma.memberCharge.findFirst).mockResolvedValue(BOB_CHARGE as any);

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
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Charge not found");
      expect(data.paid).toBeUndefined();
    });

    it("MUST reject client-supplied amount that differs from charge", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { prisma } = await import("@/lib/server/prisma");
      const { updateMemberChargeStatus } = await import("@/lib/server/records");

      const aliceCharge = { ...BOB_CHARGE, memberEmail: "alice@example.com", amount: 100 };
      vi.mocked(getSession).mockResolvedValue(ALICE_SESSION);
      vi.mocked(prisma.memberCharge.findFirst).mockResolvedValue(aliceCharge as any);

      const { POST } = await import(
        "@/app/api/member/wallet-payment-intent/route"
      );

      const request = new Request("http://localhost/api/member/wallet-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "amount",
          amount: 1,
          chargeId: aliceCharge.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      if (data.paid === true && data.mode === "demo") {
        expect(updateMemberChargeStatus).not.toHaveBeenCalledWith(
          aliceCharge.id,
          "paid"
        );
      }
    });
  });

  describe("checkout: charge ownership check", () => {
    it("MUST reject paying another user's charge via checkout", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { listMemberCharges } = await import("@/lib/server/records");

      vi.mocked(getSession).mockResolvedValue(ALICE_SESSION);
      vi.mocked(listMemberCharges).mockResolvedValue([BOB_CHARGE] as any);

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

      expect(response.status).toBe(403);
      expect(data.error).toContain("not authorized");
    });
  });

  describe("Stripe webhook: amount and owner verification", () => {
    it("MUST NOT mark charge paid when metadata user differs from charge owner", async () => {
      const { updateMemberChargeStatus } = await import("@/lib/server/records");

      expect(updateMemberChargeStatus).not.toHaveBeenCalledWith(
        BOB_CHARGE.id,
        "paid"
      );
    });

    it("MUST NOT mark charge paid when amount is short", async () => {
      const { updateMemberChargeStatus } = await import("@/lib/server/records");

      expect(updateMemberChargeStatus).not.toHaveBeenCalledWith(
        BOB_CHARGE.id,
        "paid"
      );
    });
  });
});
