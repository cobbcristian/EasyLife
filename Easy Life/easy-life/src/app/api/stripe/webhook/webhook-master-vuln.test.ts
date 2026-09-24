/**
 * Tests that demonstrate webhook vulnerabilities on master (da0523a).
 *
 * These tests are designed to FAIL on master and PASS on the fixed branch.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/stripe", () => ({
  getStripe: vi.fn(),
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

// For the fixed branch, also mock charge-payment (doesn't exist on master)
vi.mock("@/lib/server/charge-payment", () => ({
  verifyWebhookMetadata: vi.fn(),
  settleChargeIfAuthorized: vi.fn(),
  settleHoaChargeIfAuthorized: vi.fn(),
}));

import { getStripe } from "@/lib/server/stripe";
import { updateMemberChargeStatus } from "@/lib/server/records";

const mockGetStripe = getStripe as ReturnType<typeof vi.fn>;
const mockUpdateMemberChargeStatus = updateMemberChargeStatus as ReturnType<typeof vi.fn>;

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
});

describe("Webhook vulnerabilities (master)", () => {
  it("VULNERABILITY: settles charge without verifying amount covers the charge", async () => {
    // Import dynamically to get correct route version
    const { POST } = await import("./route");

    const underpaidEvent = {
      id: "evt_underpaid",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_underpaid",
          amount_total: 100, // $1.00 captured
          metadata: {
            chargeId: "charge-100-dollar", // But charge is $100
            userEmail: "alice@example.com",
          },
        },
      },
    };

    const request = makeRequest(JSON.stringify(underpaidEvent));
    const response = await POST(request);

    // MASTER BUG: Marks charge paid regardless of amount (calls updateMemberChargeStatus)
    // FIXED: settleChargeIfAuthorized checks DB amount and rejects underpayment
    //        (does NOT call updateMemberChargeStatus - uses settleChargeIfAuthorized instead)
    expect(mockUpdateMemberChargeStatus).not.toHaveBeenCalled();
  });

  it("VULNERABILITY: settles charge without verifying ownership", async () => {
    const { POST } = await import("./route");

    const wrongUserEvent = {
      id: "evt_wrong_user",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_wrong_user",
          amount_total: 10000,
          metadata: {
            chargeId: "charge-bob", // Bob's charge
            userEmail: "attacker@example.com", // But attacker's email
          },
        },
      },
    };

    const request = makeRequest(JSON.stringify(wrongUserEvent));
    const response = await POST(request);

    // MASTER BUG: Marks charge paid without checking email matches charge owner
    //             (calls updateMemberChargeStatus directly)
    // FIXED: Uses settleChargeIfAuthorized which checks ownership
    //        (does NOT call updateMemberChargeStatus - settlement handles this)
    expect(mockUpdateMemberChargeStatus).not.toHaveBeenCalled();
  });
});
