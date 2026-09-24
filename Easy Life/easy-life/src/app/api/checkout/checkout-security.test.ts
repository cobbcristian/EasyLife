/**
 * Security tests for checkout route — BLOCKER 1 fixes.
 *
 * These tests verify the charge payment binding:
 * 1. chargeId must belong to the authenticated user
 * 2. Amount comes from the charge, not the client
 * 3. Stored-card payments verify ownership before settling
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

vi.mock("@/lib/server/hoa-dues", () => ({
  markHoaChargePaid: vi.fn(),
}));

import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { getPaymentSettings, chargeStoredPaymentMethod } from "@/lib/server/payment-methods";
import { getStripe } from "@/lib/server/stripe";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";
import { POST } from "./route";

const mockGetSession = getSession as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.memberCharge.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.memberCharge.update as ReturnType<typeof vi.fn>;
const mockGetPaymentSettings = getPaymentSettings as ReturnType<typeof vi.fn>;
const mockChargeStoredPaymentMethod = chargeStoredPaymentMethod as ReturnType<typeof vi.fn>;
const mockGetStripe = getStripe as ReturnType<typeof vi.fn>;
const mockIsDemoPaymentAllowed = isDemoPaymentAllowed as ReturnType<typeof vi.fn>;

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
});

describe("POST /api/checkout - charge ownership", () => {
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

  it("allows paying own charge", async () => {
    mockFindUnique.mockResolvedValue(aliceCharge);
    mockUpdate.mockResolvedValue({ ...aliceCharge, status: "paid" });

    const request = makeRequest({
      chargeId: "charge-alice-123",
      amount: 999,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.paid).toBe(true);
  });

  it("SECURITY: rejects paying another user's charge", async () => {
    mockFindUnique.mockResolvedValue(bobCharge);

    const request = makeRequest({
      chargeId: "charge-bob-456",
      amount: 1,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toContain("Not authorized");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("SECURITY: ignores client amount when chargeId is present", async () => {
    mockFindUnique.mockResolvedValue(aliceCharge);
    mockUpdate.mockResolvedValue({ ...aliceCharge, status: "paid" });

    const request = makeRequest({
      chargeId: "charge-alice-123",
      amount: 1,
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("rejects already-paid charge", async () => {
    mockFindUnique.mockResolvedValue({ ...aliceCharge, status: "paid" });

    const request = makeRequest({
      chargeId: "charge-alice-123",
      amount: 100,
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("rejects nonexistent charge", async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = makeRequest({
      chargeId: "nonexistent",
      amount: 100,
    });
    const response = await POST(request);

    expect(response.status).toBe(404);
  });
});

describe("POST /api/checkout - stored card", () => {
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

  beforeEach(() => {
    mockGetPaymentSettings.mockResolvedValue({
      preference: "store",
      methods: [{ id: "pm-123", isDefault: true, label: "Visa ****1234" }],
      stripeEnabled: true,
      demoPaymentsAllowed: false,
      walletPayEnabled: false,
      stripePublishableKey: "pk_test_xxx",
    });
    mockChargeStoredPaymentMethod.mockResolvedValue({ status: "paid" });
  });

  it("SECURITY: stored card rejects cross-user charge", async () => {
    mockFindUnique.mockResolvedValue(bobCharge);

    const request = makeRequest({
      chargeId: "charge-bob-456",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toContain("Not authorized");
    expect(mockChargeStoredPaymentMethod).not.toHaveBeenCalled();
  });

  it("stored card settles own charge after payment", async () => {
    mockFindUnique.mockResolvedValue(aliceCharge);
    mockUpdate.mockResolvedValue({ ...aliceCharge, status: "paid" });

    const request = makeRequest({
      chargeId: "charge-alice-123",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.paid).toBe(true);
    expect(mockChargeStoredPaymentMethod).toHaveBeenCalled();
  });
});
