import { describe, expect, it } from "vitest";
import {
  normalizeWalletPayKind,
  validateWalletPayKind,
  walletIntentAmountMatchesMetadata,
} from "./wallet-payment";

describe("validateWalletPayKind", () => {
  it("rejects kind=amount with a chargeId (underpay / cross-account settle vector)", () => {
    const result = validateWalletPayKind({
      kind: "amount",
      chargeId: "chg_victim_500",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("allows kind=amount without chargeId", () => {
    expect(validateWalletPayKind({ kind: "amount" }).ok).toBe(true);
  });

  it("requires chargeId for kind=charge", () => {
    const result = validateWalletPayKind({ kind: "charge" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("allows kind=charge with chargeId", () => {
    expect(
      validateWalletPayKind({ kind: "charge", chargeId: "chg_own" }).ok,
    ).toBe(true);
  });

  it("allows kind=hoa with or without client chargeId (server resolves)", () => {
    expect(validateWalletPayKind({ kind: "hoa" }).ok).toBe(true);
    expect(
      validateWalletPayKind({ kind: "hoa", chargeId: "ignored" }).ok,
    ).toBe(true);
  });
});

describe("normalizeWalletPayKind", () => {
  it("defaults unknown kinds to amount", () => {
    expect(normalizeWalletPayKind(undefined)).toBe("amount");
    expect(normalizeWalletPayKind("nope")).toBe("amount");
  });
});

describe("walletIntentAmountMatchesMetadata", () => {
  it("allows legacy intents without amountCents", () => {
    expect(
      walletIntentAmountMatchesMetadata({
        intentAmount: 50,
        metadataAmountCents: undefined,
      }),
    ).toBe(true);
  });

  it("rejects underpayment vs metadata", () => {
    expect(
      walletIntentAmountMatchesMetadata({
        intentAmount: 50,
        metadataAmountCents: "50000",
      }),
    ).toBe(false);
  });

  it("accepts matching amounts", () => {
    expect(
      walletIntentAmountMatchesMetadata({
        intentAmount: 50000,
        metadataAmountCents: "50000",
      }),
    ).toBe(true);
  });
});
