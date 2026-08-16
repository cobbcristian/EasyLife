import { describe, expect, it } from "vitest";
import {
  createPasswordResetChallenge,
  createPasswordResetToken,
  generatePasswordResetCode,
  hashPasswordResetCode,
  verifyPasswordResetChallenge,
  verifyPasswordResetToken,
} from "./auth";

describe("password reset challenge", () => {
  it("rejects challenge without matching OTP", async () => {
    const code = generatePasswordResetCode();
    const challenge = await createPasswordResetChallenge("a@example.com", code);
    const email = await verifyPasswordResetChallenge(challenge, "00000");
    expect(email).toBeNull();
  });

  it("accepts matching OTP and mints a reset token that verifies", async () => {
    const code = "48291";
    const challenge = await createPasswordResetChallenge("b@example.com", code);
    const email = await verifyPasswordResetChallenge(challenge, code);
    expect(email).toBe("b@example.com");
    const reset = await createPasswordResetToken(email!);
    await expect(verifyPasswordResetToken(reset)).resolves.toBe("b@example.com");
  });

  it("does not treat a challenge token as a password-reset token", async () => {
    const challenge = await createPasswordResetChallenge("c@example.com", "12345");
    await expect(verifyPasswordResetToken(challenge)).resolves.toBeNull();
  });

  it("hashes codes stably", () => {
    expect(hashPasswordResetCode("12345")).toBe(hashPasswordResetCode("12345"));
    expect(hashPasswordResetCode("12345")).not.toBe(hashPasswordResetCode("54321"));
  });
});
