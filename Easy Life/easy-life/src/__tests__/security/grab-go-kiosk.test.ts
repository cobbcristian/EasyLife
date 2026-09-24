/**
 * Security regression tests for grab-go kiosk API key enforcement.
 *
 * These tests prove that on da0523a:
 * - The kiosk API accepts requests when GRAB_GO_MACHINE_KEY is unset in production
 *
 * Route code at lines 19-22:
 *   function authorizeMachine(request: Request): boolean {
 *     const key = process.env.GRAB_GO_MACHINE_KEY;
 *     if (!key) return true; // demo mode ← BUG: no NODE_ENV check
 *     return request.headers.get("x-grab-go-key") === key;
 *   }
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    grabGoMachine: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server/records", () => ({
  ensureRecordsSeeded: vi.fn(),
}));

vi.mock("@/lib/server/grab-go", () => ({
  listGrabGoMachines: vi.fn(() => []),
  openGrabGoSession: vi.fn(),
  closeGrabGoSession: vi.fn(() => ({
    session: { id: "s1", total: 0, itemsJson: "[]", unlockMethod: "app_code" },
    chargeId: null,
  })),
  recordVisionGrab: vi.fn(),
  recordVisionGrabFromNote: vi.fn(),
  declareAppItems: vi.fn(),
  GrabGoError: class GrabGoError extends Error {},
}));

const MOCK_MACHINE = {
  code: "GG-001",
  name: "Pool Snack Bar",
  location: "Pool House",
  status: "active",
  communityId: "test-community",
  cameraDeviceId: null,
  products: [],
};

describe("Grab-go kiosk API key enforcement", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("GET /api/grab-go/kiosk", () => {
    it("MUST reject requests when GRAB_GO_MACHINE_KEY is unset in production", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.GRAB_GO_MACHINE_KEY;

      vi.resetModules();

      const { prisma } = await import("@/lib/server/prisma");
      vi.mocked(prisma.grabGoMachine.findUnique).mockResolvedValue(
        MOCK_MACHINE as any
      );

      const { GET } = await import("@/app/api/grab-go/kiosk/route");

      const request = new Request(
        "http://localhost/api/grab-go/kiosk?code=GG-001",
        { method: "GET" }
      );

      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain("Unauthorized");
    });

    it("rejects wrong API key when key is set", async () => {
      process.env.GRAB_GO_MACHINE_KEY = "correct-key";

      vi.resetModules();

      const { GET } = await import("@/app/api/grab-go/kiosk/route");

      const request = new Request(
        "http://localhost/api/grab-go/kiosk?code=GG-001",
        {
          method: "GET",
          headers: { "x-grab-go-key": "wrong-key" },
        }
      );

      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/grab-go/kiosk", () => {
    it("MUST reject POST requests when GRAB_GO_MACHINE_KEY is unset in production", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.GRAB_GO_MACHINE_KEY;

      vi.resetModules();

      const { POST } = await import("@/app/api/grab-go/kiosk/route");

      const request = new Request("http://localhost/api/grab-go/kiosk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close",
          sessionId: "test-session",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain("Unauthorized");
    });
  });
});
