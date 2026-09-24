/**
 * Tests that demonstrate BLOCKER 1 vulnerabilities on master (da0523a).
 *
 * These tests are designed to FAIL on master and PASS on the fixed branch.
 * Run against master's route.ts to see the vulnerabilities.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    memberCharge: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    memberProfileExt: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    storedPaymentMethod: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server/payment-methods", () => ({
  getPaymentSettings: vi.fn(),
  chargeStoredPaymentMethod: vi.fn(),
}));

vi.mock("@/lib/server/stripe", () => ({
  getStripe: vi.fn(),
  isStripeConfigured: vi.fn(),
}));

vi.mock("@/lib/server/demo-mode", () => ({
  isDemoPaymentAllowed: vi.fn(),
}));

vi.mock("@/lib/server/local-pros", () => ({
  activateSharedCalendarByCharge: vi.fn(),
  markEscrowHeldByCharge: vi.fn(),
}));

vi.mock("@/lib/server/records", () => ({
  updateMemberChargeStatus: vi.fn(),
}));

vi.mock("@/lib/server/hoa-dues", () => ({
  markHoaChargePaid: vi.fn(),
}));

import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { getPaymentSettings } from "@/lib/server/payment-methods";
import { getStripe } from "@/lib/server/stripe";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";
import { updateMemberChargeStatus } from "@/lib/server/records";
import { POST } from "./route";

const mockGetSession = getSession as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.memberCharge.findUnique as ReturnType<typeof vi.fn>;
const mockUpdateMany = (prisma.memberCharge as unknown as { updateMany: ReturnType<typeof vi.fn> }).updateMany;
const mockGetPaymentSettings = getPaymentSettings as ReturnType<typeof vi.fn>;
const mockGetStripe = getStripe as ReturnType<typeof vi.fn>;
const mockIsDemoPaymentAllowed = isDemoPaymentAllowed as ReturnType<typeof vi.fn>;
const mockUpdateMemberChargeStatus = updateMemberChargeStatus as ReturnType<typeof vi.fn>;

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", origin: "http://localhost" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  mockGetSession.mockResolvedValue({
    email: "alice@example.com",
    name: "Alice",
    communityId: "test-club",
  });

  mockGetPaymentSettings.mockResolvedValue({
    preference: "always_prompt",
    methods: [],
    stripeEnabled: false,
    demoPaymentsAllowed: true,
    walletPayEnabled: false,
    stripePublishableKey: null,
  });

  mockGetStripe.mockReturnValue(null);
  mockIsDemoPaymentAllowed.mockReturnValue(true);
  mockUpdateMany.mockResolvedValue({ count: 1 });
});

describe("BLOCKER 1: Checkout vulnerabilities (master)", () => {
  const bobCharge = {
    id: "charge-bob-456",
    communityId: "test-club",
    memberEmail: "bob@example.com",
    memberName: "Bob",
    category: "general",
    description: "Golf cart rental",
    amount: 200.0,
    status: "due",
  };

  it("VULNERABILITY: allows paying another user's charge without ownership check", async () => {
    mockFindUnique.mockResolvedValue(bobCharge);

    const request = makeRequest({
      chargeId: "charge-bob-456",
      amount: 1,
    });
    const response = await POST(request);

    // MASTER BUG: Returns 200 and marks Bob's charge paid even though Alice is logged in
    // FIXED: Should return 403 "Not authorized to pay this charge"
    expect(response.status).toBe(403);
  });

  it("VULNERABILITY: accepts client-supplied amount instead of charge amount", async () => {
    const aliceCharge = {
      id: "charge-alice-123",
      communityId: "test-club",
      memberEmail: "alice@example.com",
      memberName: "Alice",
      category: "general",
      description: "Tennis lesson fee",
      amount: 100.0,
      status: "due",
    };
    mockFindUnique.mockResolvedValue(aliceCharge);

    const request = makeRequest({
      chargeId: "charge-alice-123",
      amount: 1, // Client sends $1 instead of $100
    });
    const response = await POST(request);
    const json = await response.json();

    // MASTER BUG: Uses client's $1 amount, marks paid
    // FIXED: Ignores client amount, uses charge's $100 from DB
    expect(response.status).toBe(200);
    expect(json.paid).toBe(true);
    // The fix uses settleChargeIfAuthorized which uses updateMany
    // This verifies the settlement happened (on the fixed branch)
    expect(mockUpdateMany).toHaveBeenCalled();
  });
});
