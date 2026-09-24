import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  hashDriverPin,
  verifyDriverPin,
  pinNeedsRehash,
  createDriverSessionToken,
  verifyDriverSessionToken,
  checkPinRateLimit,
  recordFailedPinAttempt,
  clearPinRateLimit,
} from "@/lib/server/driver-auth";

describe("driver PIN security", () => {
  it("hashes PINs with scrypt", () => {
    const pin = "1234";
    const hash = hashDriverPin(pin);
    expect(hash).toMatch(/^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
    expect(hash).not.toContain(pin);
  });

  it("verifies hashed PINs correctly", () => {
    const pin = "5678";
    const hash = hashDriverPin(pin);
    expect(verifyDriverPin(pin, hash)).toBe(true);
    expect(verifyDriverPin("wrong", hash)).toBe(false);
    expect(verifyDriverPin("56789", hash)).toBe(false);
  });

  it("verifies legacy plaintext PINs with constant-time compare", () => {
    expect(verifyDriverPin("1234", "1234")).toBe(true);
    expect(verifyDriverPin("1234", "9999")).toBe(false);
    expect(verifyDriverPin("12345", "1234")).toBe(false);
  });

  it("detects plaintext PINs need rehashing", () => {
    expect(pinNeedsRehash("1234")).toBe(true);
    expect(pinNeedsRehash(hashDriverPin("1234"))).toBe(false);
    expect(pinNeedsRehash(null)).toBe(false);
  });

  it("rejects null or empty PINs", () => {
    expect(verifyDriverPin("1234", null)).toBe(false);
    expect(verifyDriverPin("1234", "")).toBe(false);
    expect(verifyDriverPin("", "1234")).toBe(false);
  });
});

describe("driver session tokens", () => {
  it("creates and verifies JWT session tokens", async () => {
    const payload = {
      sub: "driver-123",
      communityId: "golden-ocala",
      name: "John Driver",
    };
    const token = await createDriverSessionToken(payload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    const verified = await verifyDriverSessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe("driver-123");
    expect(verified?.communityId).toBe("golden-ocala");
    expect(verified?.name).toBe("John Driver");
  });

  it("rejects invalid tokens", async () => {
    expect(await verifyDriverSessionToken(undefined)).toBeNull();
    expect(await verifyDriverSessionToken("")).toBeNull();
    expect(await verifyDriverSessionToken("invalid.token.here")).toBeNull();
  });

  it("rejects tokens from different keys", async () => {
    const payload = { sub: "driver-123", communityId: "golden-ocala", name: "Test" };
    const token = await createDriverSessionToken(payload);
    // Tamper with the token
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(await verifyDriverSessionToken(tampered)).toBeNull();
  });
});

describe("PIN rate limiting", () => {
  const testKey = `test-driver-${Date.now()}`;

  beforeEach(() => {
    clearPinRateLimit(testKey);
  });

  afterEach(() => {
    clearPinRateLimit(testKey);
  });

  it("allows initial attempts", () => {
    const result = checkPinRateLimit(testKey);
    expect(result.allowed).toBe(true);
  });

  it("locks out after max failed attempts", () => {
    // Record 5 failed attempts
    for (let i = 0; i < 4; i++) {
      const result = recordFailedPinAttempt(testKey);
      expect(result.locked).toBe(false);
    }
    
    // 5th attempt triggers lockout
    const lockResult = recordFailedPinAttempt(testKey);
    expect(lockResult.locked).toBe(true);
    expect(lockResult.locked && lockResult.retryAfter).toBeGreaterThan(0);
    
    // Subsequent checks should be blocked
    const checkResult = checkPinRateLimit(testKey);
    expect(checkResult.allowed).toBe(false);
  });

  it("clears rate limit after successful auth", () => {
    recordFailedPinAttempt(testKey);
    recordFailedPinAttempt(testKey);
    clearPinRateLimit(testKey);
    
    const result = checkPinRateLimit(testKey);
    expect(result.allowed).toBe(true);
  });
});

describe("token audience isolation", () => {
  it("driver token cannot pass as member session (aud=driver)", async () => {
    const { verifySessionToken } = await import("@/lib/server/auth");
    
    const driverPayload = {
      sub: "driver-123",
      communityId: "golden-ocala",
      name: "John Driver",
    };
    const driverToken = await createDriverSessionToken(driverPayload);
    
    const memberSession = await verifySessionToken(driverToken);
    expect(memberSession).toBeNull();
  });

  it("member token cannot pass as driver session (no aud claim)", async () => {
    const { createSessionToken } = await import("@/lib/server/auth");
    
    const memberPayload = {
      sub: "user-123",
      email: "member@example.com",
      role: "member" as const,
      name: "Jane Member",
      communityId: "golden-ocala",
    };
    const memberToken = await createSessionToken(memberPayload);
    
    const driverSession = await verifyDriverSessionToken(memberToken);
    expect(driverSession).toBeNull();
  });
});
