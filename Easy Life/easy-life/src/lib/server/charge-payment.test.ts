/**
 * Tests for charge-payment.ts — unified charge resolution and settlement.
 *
 * These tests verify the core security invariants:
 * 1. Charges can only be resolved/settled by the owner (email match)
 * 2. Settlement requires sufficient payment amount
 * 3. Webhook metadata verification blocks underpay attacks
 * 4. Settlement is atomic (duplicate webhooks don't double-trigger side effects)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveOwnedOpenCharge,
  settleChargeIfAuthorized,
  settleHoaChargeIfAuthorized,
  verifyWebhookMetadata,
  buildChargeMetadata,
} from "./charge-payment";

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    memberCharge: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    memberProfileExt: {
      findUnique: vi.fn(),
    },
    unitHoaFee: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server/local-pros", () => ({
  activateSharedCalendarByCharge: vi.fn(),
  markEscrowHeldByCharge: vi.fn(),
}));

import { prisma } from "@/lib/server/prisma";
import { activateSharedCalendarByCharge, markEscrowHeldByCharge } from "@/lib/server/local-pros";

const mockFindUnique = prisma.memberCharge.findUnique as ReturnType<typeof vi.fn>;
const mockUpdateMany = prisma.memberCharge.updateMany as ReturnType<typeof vi.fn>;
const mockProfileFindUnique = prisma.memberProfileExt.findUnique as ReturnType<typeof vi.fn>;
const mockHoaFeeFindFirst = prisma.unitHoaFee.findFirst as ReturnType<typeof vi.fn>;
const mockHoaFeeUpdate = prisma.unitHoaFee.update as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveOwnedOpenCharge", () => {
  const baseCharge = {
    id: "charge-123",
    communityId: "test-club",
    memberEmail: "alice@example.com",
    memberName: "Alice",
    category: "general",
    description: "Tennis lesson fee",
    amount: 50.0,
    status: "due",
  };

  it("resolves a charge owned by the payer", async () => {
    mockFindUnique.mockResolvedValue(baseCharge);

    const result = await resolveOwnedOpenCharge("charge-123", "alice@example.com");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.charge.id).toBe("charge-123");
      expect(result.charge.amount).toBe(50.0);
      expect(result.charge.amountCents).toBe(5000);
    }
  });

  it("resolves case-insensitively", async () => {
    mockFindUnique.mockResolvedValue(baseCharge);

    const result = await resolveOwnedOpenCharge("charge-123", "ALICE@EXAMPLE.COM");

    expect(result.ok).toBe(true);
  });

  it("rejects when charge not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await resolveOwnedOpenCharge("nonexistent", "alice@example.com");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.error).toContain("not found");
    }
  });

  it("rejects when charge is already paid", async () => {
    mockFindUnique.mockResolvedValue({ ...baseCharge, status: "paid" });

    const result = await resolveOwnedOpenCharge("charge-123", "alice@example.com");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toContain("already paid");
    }
  });

  it("SECURITY: rejects when payer email does not match charge owner", async () => {
    mockFindUnique.mockResolvedValue(baseCharge);

    const result = await resolveOwnedOpenCharge("charge-123", "attacker@evil.com");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toContain("Not authorized");
    }
  });

  it("SECURITY: rejects when charge has no memberEmail", async () => {
    mockFindUnique.mockResolvedValue({ ...baseCharge, memberEmail: null });

    const result = await resolveOwnedOpenCharge("charge-123", "alice@example.com");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});

describe("settleChargeIfAuthorized", () => {
  const baseCharge = {
    id: "charge-123",
    communityId: "test-club",
    memberEmail: "alice@example.com",
    memberName: "Alice",
    category: "general",
    description: "Tennis lesson fee",
    amount: 50.0,
    status: "due",
  };

  it("settles a charge when amount covers and owner matches", async () => {
    mockFindUnique.mockResolvedValue(baseCharge);
    mockUpdateMany.mockResolvedValue({ count: 1 });

    const result = await settleChargeIfAuthorized({
      chargeId: "charge-123",
      payerEmail: "alice@example.com",
      paidCents: 5000,
    });

    expect(result.ok).toBe(true);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "charge-123", status: { not: "paid" } },
      data: { status: "paid" },
    });
    expect(activateSharedCalendarByCharge).toHaveBeenCalledWith("charge-123");
    expect(markEscrowHeldByCharge).toHaveBeenCalledWith("charge-123");
  });

  it("settles without email check when payerEmail not provided (legacy/guest)", async () => {
    mockFindUnique.mockResolvedValue(baseCharge);
    mockUpdateMany.mockResolvedValue({ count: 1 });

    const result = await settleChargeIfAuthorized({
      chargeId: "charge-123",
      paidCents: 5000,
    });

    expect(result.ok).toBe(true);
  });

  it("accepts overpayment", async () => {
    mockFindUnique.mockResolvedValue(baseCharge);
    mockUpdateMany.mockResolvedValue({ count: 1 });

    const result = await settleChargeIfAuthorized({
      chargeId: "charge-123",
      payerEmail: "alice@example.com",
      paidCents: 10000,
    });

    expect(result.ok).toBe(true);
  });

  it("SECURITY: rejects underpayment", async () => {
    mockFindUnique.mockResolvedValue(baseCharge);

    const result = await settleChargeIfAuthorized({
      chargeId: "charge-123",
      payerEmail: "alice@example.com",
      paidCents: 4999,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("does not cover");
    }
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("SECURITY: rejects cross-user settlement when email provided", async () => {
    mockFindUnique.mockResolvedValue(baseCharge);

    const result = await settleChargeIfAuthorized({
      chargeId: "charge-123",
      payerEmail: "attacker@evil.com",
      paidCents: 5000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Not authorized");
    }
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("is idempotent for already-paid charges", async () => {
    mockFindUnique.mockResolvedValue({ ...baseCharge, status: "paid" });

    const result = await settleChargeIfAuthorized({
      chargeId: "charge-123",
      payerEmail: "alice@example.com",
      paidCents: 5000,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadyPaid).toBe(true);
    }
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("ATOMIC: does not run side effects when updateMany returns count=0 (race condition)", async () => {
    mockFindUnique.mockResolvedValue(baseCharge);
    mockUpdateMany.mockResolvedValue({ count: 0 });

    const result = await settleChargeIfAuthorized({
      chargeId: "charge-123",
      payerEmail: "alice@example.com",
      paidCents: 5000,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadyPaid).toBe(true);
    }
    expect(activateSharedCalendarByCharge).not.toHaveBeenCalled();
    expect(markEscrowHeldByCharge).not.toHaveBeenCalled();
  });

  it("does not run calendar/escrow side effects for HOA charges", async () => {
    mockFindUnique.mockResolvedValue({ ...baseCharge, category: "hoa" });
    mockUpdateMany.mockResolvedValue({ count: 1 });

    const result = await settleChargeIfAuthorized({
      chargeId: "charge-123",
      payerEmail: "alice@example.com",
      paidCents: 5000,
    });

    expect(result.ok).toBe(true);
    expect(activateSharedCalendarByCharge).not.toHaveBeenCalled();
    expect(markEscrowHeldByCharge).not.toHaveBeenCalled();
  });
});

describe("settleHoaChargeIfAuthorized", () => {
  const hoaCharge = {
    id: "hoa-charge-123",
    communityId: "oceanside-residents",
    memberEmail: "resident@example.com",
    memberName: "Resident",
    category: "hoa",
    description: "HOA dues",
    amount: 875.0,
    status: "due",
  };

  it("settles HOA charge and clears unit balance", async () => {
    mockFindUnique.mockResolvedValue(hoaCharge);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockProfileFindUnique.mockResolvedValue({ unit: "1205" });
    mockHoaFeeFindFirst.mockResolvedValue({ id: "fee-123", communityId: "oceanside-residents", unit: "1205" });
    mockHoaFeeUpdate.mockResolvedValue({});

    const result = await settleHoaChargeIfAuthorized({
      chargeId: "hoa-charge-123",
      payerEmail: "resident@example.com",
      paidCents: 87500,
    });

    expect(result.ok).toBe(true);
    expect(mockHoaFeeUpdate).toHaveBeenCalledWith({
      where: { id: "fee-123" },
      data: { currentBalance: null },
    });
  });

  it("rejects non-HOA charges", async () => {
    mockFindUnique.mockResolvedValue({ ...hoaCharge, category: "general" });

    const result = await settleHoaChargeIfAuthorized({
      chargeId: "charge-123",
      payerEmail: "resident@example.com",
      paidCents: 87500,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Not an HOA charge");
    }
  });

  it("SECURITY: rejects underpayment", async () => {
    mockFindUnique.mockResolvedValue(hoaCharge);

    const result = await settleHoaChargeIfAuthorized({
      chargeId: "hoa-charge-123",
      payerEmail: "resident@example.com",
      paidCents: 87499,
    });

    expect(result.ok).toBe(false);
  });

  it("SECURITY: rejects cross-user settlement", async () => {
    mockFindUnique.mockResolvedValue(hoaCharge);

    const result = await settleHoaChargeIfAuthorized({
      chargeId: "hoa-charge-123",
      payerEmail: "attacker@evil.com",
      paidCents: 87500,
    });

    expect(result.ok).toBe(false);
  });
});

describe("verifyWebhookMetadata", () => {
  it("returns chargeId and userEmail when valid", () => {
    const metadata = {
      chargeId: "charge-123",
      userEmail: "alice@example.com",
      amountCents: "5000",
    };

    const result = verifyWebhookMetadata(metadata, 5000);

    expect(result).toEqual({
      chargeId: "charge-123",
      userEmail: "alice@example.com",
      isHoa: false,
    });
  });

  it("accepts legacy metadata without amountCents", () => {
    const metadata = {
      chargeId: "charge-123",
      userEmail: "alice@example.com",
    };

    const result = verifyWebhookMetadata(metadata, 5000);

    expect(result).toEqual({
      chargeId: "charge-123",
      userEmail: "alice@example.com",
      isHoa: false,
    });
  });

  it("accepts legacy metadata without userEmail (guest pay)", () => {
    const metadata = {
      chargeId: "charge-123",
    };

    const result = verifyWebhookMetadata(metadata, 5000);

    expect(result).toEqual({
      chargeId: "charge-123",
      userEmail: undefined,
      isHoa: false,
    });
  });

  it("accepts overpayment", () => {
    const metadata = {
      chargeId: "charge-123",
      userEmail: "alice@example.com",
      amountCents: "5000",
    };

    const result = verifyWebhookMetadata(metadata, 10000);

    expect(result).not.toBeNull();
  });

  it("SECURITY: rejects underpayment when amountCents present", () => {
    const metadata = {
      chargeId: "charge-123",
      userEmail: "alice@example.com",
      amountCents: "5000",
    };

    const result = verifyWebhookMetadata(metadata, 4999);

    expect(result).toBeNull();
  });

  it("identifies HOA charges", () => {
    const metadata = {
      chargeId: "charge-123",
      userEmail: "alice@example.com",
      type: "hoa",
    };

    const result = verifyWebhookMetadata(metadata, 5000);

    expect(result?.isHoa).toBe(true);
  });

  it("SECURITY: rejects missing chargeId", () => {
    const metadata = {
      userEmail: "alice@example.com",
      amountCents: "5000",
    };

    const result = verifyWebhookMetadata(metadata, 5000);

    expect(result).toBeNull();
  });

  it("SECURITY: rejects null metadata", () => {
    const result = verifyWebhookMetadata(null, 5000);
    expect(result).toBeNull();
  });

  it("SECURITY: rejects undefined metadata", () => {
    const result = verifyWebhookMetadata(undefined, 5000);
    expect(result).toBeNull();
  });
});

describe("buildChargeMetadata", () => {
  it("includes required fields for webhook verification", () => {
    const charge = {
      id: "charge-123",
      communityId: "test-club",
      memberEmail: "alice@example.com",
      memberName: "Alice",
      category: "general",
      description: "Tennis lesson",
      amount: 50.0,
      amountCents: 5000,
      status: "due",
    };

    const metadata = buildChargeMetadata(charge, "Alice@Example.com");

    expect(metadata.chargeId).toBe("charge-123");
    expect(metadata.userEmail).toBe("alice@example.com");
    expect(metadata.amountCents).toBe("5000");
    expect(metadata.type).toBeUndefined();
  });

  it("includes type=hoa for HOA charges", () => {
    const charge = {
      id: "charge-123",
      communityId: "test-club",
      memberEmail: "alice@example.com",
      memberName: "Alice",
      category: "hoa",
      description: "HOA dues",
      amount: 875.0,
      amountCents: 87500,
      status: "due",
    };

    const metadata = buildChargeMetadata(charge, "alice@example.com");

    expect(metadata.type).toBe("hoa");
  });
});
