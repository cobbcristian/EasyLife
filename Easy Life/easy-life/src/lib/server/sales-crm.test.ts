import { describe, expect, it } from "vitest";
import { existingAccountBlocksSalesHire } from "@/lib/server/sales-hire-policy";

describe("existingAccountBlocksSalesHire", () => {
  it("allows creating a brand-new salesperson email", () => {
    expect(
      existingAccountBlocksSalesHire({
        userExists: false,
        alreadySalesperson: false,
      }),
    ).toBeNull();
  });

  it("rejects emails that already have a salesperson profile", () => {
    expect(
      existingAccountBlocksSalesHire({
        userExists: true,
        alreadySalesperson: true,
      }),
    ).toBe("This user is already a salesperson");
  });

  it("rejects converting existing club accounts (admin/member/provider)", () => {
    expect(
      existingAccountBlocksSalesHire({
        userExists: true,
        alreadySalesperson: false,
      }),
    ).toBe("An account with this email already exists");
  });
});
