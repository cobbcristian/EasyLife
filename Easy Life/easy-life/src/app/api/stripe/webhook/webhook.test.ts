/**
 * Tests for Stripe webhook route.
 *
 * Verifies:
 * 1. Legacy metadata (without amountCents) settles when captured covers DB amount
 * 2. Underpaid capture doesn't settle
 * 3. Wrong userEmail doesn't settle
 * 4. Logs errors but returns 200 (don't trigger Stripe retries)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/server/stripe", () => ({
  getStripe: vi.fn(),
}));

vi.mock("@/lib/server/charge-payment", () => ({
  verifyWebhookMetadata: vi.fn(),
  settleChargeIfAuthorized: vi.fn(),
  settleHoaChargeIfAuthorized: vi.fn(),
}));

import { getStripe } from "@/lib/server/stripe";
import {
  verifyWebhookMetadata,
  settleChargeIfAuthorized,
  settleHoaChargeIfAuthorized,
} from "@/lib/server/charge-payment";

const mockGetStripe = getStripe as ReturnType<typeof vi.fn>;
const mockVerifyWebhookMetadata = verifyWebhookMetadata as ReturnType<typeof vi.fn>;
const mockSettleChargeIfAuthorized = settleChargeIfAuthorized as ReturnType<typeof vi.fn>;
const mockSettleHoaChargeIfAuthorized = settleHoaChargeIfAuthorized as ReturnType<typeof vi.fn>;

const mockStripe = {
  webhooks: {
    constructEvent: vi.fn(),
  },
};

function makeRequest(body: string, signature = "valid-sig"): Request {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  mockGetStripe.mockReturnValue(mockStripe);
  mockStripe.webhooks.constructEvent.mockImplementation((body) => JSON.parse(body));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/stripe/webhook", () => {
  describe("checkout.session.completed", () => {
    const checkoutEvent = {
      id: "evt_checkout_123",
      type: "checkout.session.completed",
      data: {
        object: {
          amount_total: 5000,
          metadata: {
            chargeId: "charge-123",
            userEmail: "alice@example.com",
            amountCents: "5000",
          },
        },
      },
    };

    it("settles charge when metadata is valid", async () => {
      mockVerifyWebhookMetadata.mockReturnValue({
        chargeId: "charge-123",
        userEmail: "alice@example.com",
        isHoa: false,
      });
      mockSettleChargeIfAuthorized.mockResolvedValue({ ok: true, settled: true });

      const request = makeRequest(JSON.stringify(checkoutEvent));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSettleChargeIfAuthorized).toHaveBeenCalledWith({
        chargeId: "charge-123",
        payerEmail: "alice@example.com",
        paidCents: 5000,
      });
    });

    it("settles legacy metadata without amountCents", async () => {
      const legacyEvent = {
        ...checkoutEvent,
        data: {
          object: {
            amount_total: 5000,
            metadata: {
              chargeId: "charge-123",
              userEmail: "alice@example.com",
            },
          },
        },
      };
      mockVerifyWebhookMetadata.mockReturnValue({
        chargeId: "charge-123",
        userEmail: "alice@example.com",
        isHoa: false,
      });
      mockSettleChargeIfAuthorized.mockResolvedValue({ ok: true, settled: true });

      const request = makeRequest(JSON.stringify(legacyEvent));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSettleChargeIfAuthorized).toHaveBeenCalled();
    });

    it("settles guest pay without userEmail", async () => {
      const guestEvent = {
        ...checkoutEvent,
        data: {
          object: {
            amount_total: 2500,
            metadata: {
              chargeId: "guest-charge-123",
            },
          },
        },
      };
      mockVerifyWebhookMetadata.mockReturnValue({
        chargeId: "guest-charge-123",
        userEmail: undefined,
        isHoa: false,
      });
      mockSettleChargeIfAuthorized.mockResolvedValue({ ok: true, settled: true });

      const request = makeRequest(JSON.stringify(guestEvent));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSettleChargeIfAuthorized).toHaveBeenCalledWith({
        chargeId: "guest-charge-123",
        payerEmail: undefined,
        paidCents: 2500,
      });
    });

    it("SECURITY: does not settle when amountCents check fails", async () => {
      mockVerifyWebhookMetadata.mockReturnValue(null);

      const request = makeRequest(JSON.stringify(checkoutEvent));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSettleChargeIfAuthorized).not.toHaveBeenCalled();
    });

    it("SECURITY: does not settle when ownership check fails", async () => {
      mockVerifyWebhookMetadata.mockReturnValue({
        chargeId: "charge-123",
        userEmail: "wrong@example.com",
        isHoa: false,
      });
      mockSettleChargeIfAuthorized.mockResolvedValue({
        ok: false,
        error: "Not authorized to settle this charge",
      });

      const request = makeRequest(JSON.stringify(checkoutEvent));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(console.error).toHaveBeenCalledWith(
        "[stripe-webhook] settlement rejected",
        expect.objectContaining({
          chargeId: "charge-123",
          reason: "Not authorized to settle this charge",
        }),
      );
    });

    it("SECURITY: does not settle when underpaid (DB amount check)", async () => {
      mockVerifyWebhookMetadata.mockReturnValue({
        chargeId: "charge-123",
        userEmail: "alice@example.com",
        isHoa: false,
      });
      mockSettleChargeIfAuthorized.mockResolvedValue({
        ok: false,
        error: "Payment 5000 cents does not cover charge 10000 cents",
      });

      const request = makeRequest(JSON.stringify(checkoutEvent));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(console.error).toHaveBeenCalledWith(
        "[stripe-webhook] settlement rejected",
        expect.objectContaining({
          chargeId: "charge-123",
          reason: expect.stringContaining("does not cover"),
        }),
      );
    });

    it("logs but returns 200 on settlement rejection", async () => {
      mockVerifyWebhookMetadata.mockReturnValue({
        chargeId: "charge-123",
        userEmail: "alice@example.com",
        isHoa: false,
      });
      mockSettleChargeIfAuthorized.mockResolvedValue({
        ok: false,
        error: "Some error",
      });

      const request = makeRequest(JSON.stringify(checkoutEvent));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(console.error).toHaveBeenCalled();
    });

    it("settles HOA charges through settleHoaChargeIfAuthorized", async () => {
      const hoaEvent = {
        ...checkoutEvent,
        data: {
          object: {
            amount_total: 87500,
            metadata: {
              chargeId: "hoa-charge-123",
              userEmail: "resident@example.com",
              type: "hoa",
              amountCents: "87500",
            },
          },
        },
      };
      mockVerifyWebhookMetadata.mockReturnValue({
        chargeId: "hoa-charge-123",
        userEmail: "resident@example.com",
        isHoa: true,
      });
      mockSettleHoaChargeIfAuthorized.mockResolvedValue({ ok: true, settled: true });

      const request = makeRequest(JSON.stringify(hoaEvent));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSettleHoaChargeIfAuthorized).toHaveBeenCalledWith({
        chargeId: "hoa-charge-123",
        payerEmail: "resident@example.com",
        paidCents: 87500,
      });
      expect(mockSettleChargeIfAuthorized).not.toHaveBeenCalled();
    });
  });

  describe("payment_intent.succeeded", () => {
    const intentEvent = {
      id: "evt_intent_123",
      type: "payment_intent.succeeded",
      data: {
        object: {
          amount_received: 5000,
          amount: 5000,
          metadata: {
            chargeId: "charge-123",
            userEmail: "alice@example.com",
            amountCents: "5000",
          },
        },
      },
    };

    it("settles charge when metadata is valid", async () => {
      mockVerifyWebhookMetadata.mockReturnValue({
        chargeId: "charge-123",
        userEmail: "alice@example.com",
        isHoa: false,
      });
      mockSettleChargeIfAuthorized.mockResolvedValue({ ok: true, settled: true });

      const request = makeRequest(JSON.stringify(intentEvent));
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSettleChargeIfAuthorized).toHaveBeenCalledWith({
        chargeId: "charge-123",
        payerEmail: "alice@example.com",
        paidCents: 5000,
      });
    });
  });

  it("returns 503 when Stripe not configured", async () => {
    mockGetStripe.mockReturnValue(null);

    const request = makeRequest("{}");
    const response = await POST(request);

    expect(response.status).toBe(503);
  });

  it("returns 400 when signature missing", async () => {
    const request = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
