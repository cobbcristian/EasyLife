import { describe, expect, it } from "vitest";
import { authorizeGrabGoMachine } from "@/lib/server/grab-go-machine-auth";

/**
 * Tests for Grab & Go kiosk machine key authentication.
 * 
 * Security requirements (HIGH 4):
 * 1. MUST fail closed in production when GRAB_GO_MACHINE_KEY is unset (503)
 * 2. MAY allow open access in dev/test when key is unset
 * 3. MUST use constant-time comparison for the key (via SHA-256)
 * 4. MUST reject incorrect keys with 401
 */

function makeRequest(key?: string): Request {
  const headers = new Headers();
  if (key !== undefined) {
    headers.set("x-grab-go-key", key);
  }
  return new Request("http://localhost/api/grab-go/kiosk", { headers });
}

describe("grab-go kiosk machine key (real module)", () => {
  describe("production environment", () => {
    it("rejects requests when GRAB_GO_MACHINE_KEY is unset (503)", () => {
      const req = makeRequest();
      const result = authorizeGrabGoMachine(req, {
        machineKey: undefined,
        nodeEnv: "production",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(503);
        expect(result.error).toContain("not configured");
      }
    });

    it("rejects requests with wrong key (401)", () => {
      const req = makeRequest("wrong-key");
      const result = authorizeGrabGoMachine(req, {
        machineKey: "correct-key",
        nodeEnv: "production",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(401);
      }
    });

    it("rejects requests with missing key header (401)", () => {
      const req = makeRequest();
      const result = authorizeGrabGoMachine(req, {
        machineKey: "correct-key",
        nodeEnv: "production",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(401);
      }
    });

    it("allows requests with correct key", () => {
      const req = makeRequest("correct-key");
      const result = authorizeGrabGoMachine(req, {
        machineKey: "correct-key",
        nodeEnv: "production",
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("development/test environment", () => {
    it("allows open access when GRAB_GO_MACHINE_KEY is unset", () => {
      const req = makeRequest();
      
      const resultDev = authorizeGrabGoMachine(req, {
        machineKey: undefined,
        nodeEnv: "development",
      });
      expect(resultDev.ok).toBe(true);

      const resultTest = authorizeGrabGoMachine(req, {
        machineKey: undefined,
        nodeEnv: "test",
      });
      expect(resultTest.ok).toBe(true);
    });

    it("still validates key when set in dev", () => {
      const req = makeRequest("wrong-key");
      const result = authorizeGrabGoMachine(req, {
        machineKey: "correct-key",
        nodeEnv: "development",
      });
      expect(result.ok).toBe(false);
    });

    it("allows correct key in dev", () => {
      const req = makeRequest("correct-key");
      const result = authorizeGrabGoMachine(req, {
        machineKey: "correct-key",
        nodeEnv: "development",
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("constant-time comparison (sha256)", () => {
    it("rejects keys of different lengths", () => {
      const req = makeRequest("short");
      const result = authorizeGrabGoMachine(req, {
        machineKey: "much-longer-key",
        nodeEnv: "production",
      });
      expect(result.ok).toBe(false);
    });

    it("rejects empty key vs set key", () => {
      const req = makeRequest("");
      const result = authorizeGrabGoMachine(req, {
        machineKey: "secret-key",
        nodeEnv: "production",
      });
      expect(result.ok).toBe(false);
    });

    it("handles long keys correctly", () => {
      const longKey = "a".repeat(1000);
      const req = makeRequest(longKey);
      const result = authorizeGrabGoMachine(req, {
        machineKey: longKey,
        nodeEnv: "production",
      });
      expect(result.ok).toBe(true);
    });
  });
});
