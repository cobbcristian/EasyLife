import { describe, expect, it, vi, beforeEach } from "vitest";

const memberProfileExt = {
  findMany: vi.fn(),
  deleteMany: vi.fn(),
};
const storedPaymentMethod = { deleteMany: vi.fn() };
const expoPushToken = { deleteMany: vi.fn() };
const rewardTransaction = { deleteMany: vi.fn() };
const rewardAccount = { deleteMany: vi.fn() };
const customersDel = vi.fn();

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    memberProfileExt,
    storedPaymentMethod,
    expoPushToken,
    rewardTransaction,
    rewardAccount,
  },
}));

vi.mock("@/lib/server/stripe", () => ({
  isStripeConfigured: () => true,
  getStripe: () => ({ customers: { del: customersDel } }),
}));

describe("purgeEmailBoundAccountData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memberProfileExt.findMany.mockResolvedValue([
      { userEmail: "ex.member@club.com", stripeCustomerId: "cus_old" },
    ]);
    memberProfileExt.deleteMany.mockResolvedValue({ count: 1 });
    storedPaymentMethod.deleteMany.mockResolvedValue({ count: 1 });
    expoPushToken.deleteMany.mockResolvedValue({ count: 1 });
    rewardTransaction.deleteMany.mockResolvedValue({ count: 2 });
    rewardAccount.deleteMany.mockResolvedValue({ count: 1 });
    customersDel.mockResolvedValue({});
  });

  it("deletes Stripe customer and email-keyed payment/profile/push/reward rows", async () => {
    const { purgeEmailBoundAccountData } = await import(
      "@/lib/server/account-purge"
    );
    await purgeEmailBoundAccountData("Ex.Member@Club.com");

    expect(customersDel).toHaveBeenCalledWith("cus_old");
    const emailFilter = {
      userEmail: { equals: "ex.member@club.com", mode: "insensitive" },
    };
    expect(storedPaymentMethod.deleteMany).toHaveBeenCalledWith({
      where: emailFilter,
    });
    expect(memberProfileExt.deleteMany).toHaveBeenCalledWith({
      where: emailFilter,
    });
    expect(expoPushToken.deleteMany).toHaveBeenCalledWith({
      where: emailFilter,
    });
    expect(rewardAccount.deleteMany).toHaveBeenCalledWith({
      where: emailFilter,
    });
  });

  it("is a no-op for blank email", async () => {
    const { purgeEmailBoundAccountData } = await import(
      "@/lib/server/account-purge"
    );
    await purgeEmailBoundAccountData("   ");
    expect(memberProfileExt.findMany).not.toHaveBeenCalled();
  });
});
