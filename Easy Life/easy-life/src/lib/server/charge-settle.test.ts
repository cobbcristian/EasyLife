import { describe, expect, it } from "vitest";

/** Mirrors settleChargeIfAuthorized amount + ownership gates (pure). */
function canSettle(input: {
  chargeAmount: number;
  chargeMemberEmail: string | null;
  paidCents: number;
  payerEmail?: string | null;
  chargeStatus: string;
}): boolean {
  if (input.chargeStatus === "paid") return false;
  if (input.payerEmail) {
    const payer = input.payerEmail.toLowerCase();
    if (
      !input.chargeMemberEmail ||
      input.chargeMemberEmail.toLowerCase() !== payer
    ) {
      return false;
    }
  }
  const dueCents = Math.round(input.chargeAmount * 100);
  return input.paidCents + 1 >= dueCents;
}

describe("settleChargeIfAuthorized rules", () => {
  it("rejects foreign payer email even when amount covers the bill", () => {
    expect(
      canSettle({
        chargeAmount: 100,
        chargeMemberEmail: "victim@club.com",
        paidCents: 10000,
        payerEmail: "attacker@club.com",
        chargeStatus: "due",
      }),
    ).toBe(false);
  });

  it("rejects underpayment on an owned charge", () => {
    expect(
      canSettle({
        chargeAmount: 100,
        chargeMemberEmail: "me@club.com",
        paidCents: 1,
        payerEmail: "me@club.com",
        chargeStatus: "due",
      }),
    ).toBe(false);
  });

  it("allows exact payment by the charge owner", () => {
    expect(
      canSettle({
        chargeAmount: 48.5,
        chargeMemberEmail: "me@club.com",
        paidCents: 4850,
        payerEmail: "me@club.com",
        chargeStatus: "due",
      }),
    ).toBe(true);
  });
});
