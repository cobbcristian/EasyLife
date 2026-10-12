import { randomBytes } from "crypto";
import { describe, expect, it } from "vitest";
import {
  encodeAspNetIdentityV3ForTests,
  hashPassword,
  isAspNetIdentityHash,
  passwordNeedsRehash,
  verifyPassword,
} from "./password";

describe("ASP.NET Identity password support", () => {
  it("verifies Identity V3 (HMAC-SHA256) hashes", () => {
    const salt = randomBytes(16);
    const password = "Oceanside!23";
    const stored = encodeAspNetIdentityV3ForTests({ password, salt });
    expect(isAspNetIdentityHash(stored)).toBe(true);
    expect(verifyPassword(password, stored)).toBe(true);
    expect(verifyPassword("wrong", stored)).toBe(false);
    expect(passwordNeedsRehash(stored)).toBe(true);
  });

  it("still verifies scrypt hashes", () => {
    const stored = hashPassword("Hello!World1");
    expect(verifyPassword("Hello!World1", stored)).toBe(true);
    expect(passwordNeedsRehash(stored)).toBe(false);
  });
});
