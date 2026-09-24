/**
 * Security regression tests for driver API authentication.
 *
 * These tests prove that on da0523a:
 * - The api/driver assignment list returns data without session auth
 * - The PATCH endpoint modifies assignments without session auth
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    tramDriver: {
      findUnique: vi.fn(),
    },
    tramRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server/sms", () => ({
  sendSms: vi.fn(),
  isSmsConfigured: vi.fn(() => false),
}));

const MOCK_DRIVER = {
  id: "driver-1",
  name: "John Driver",
  status: "available",
  vehicleId: "v1",
  communityId: "test-community",
  pin: "1234",
  active: true,
};

const MOCK_ASSIGNMENTS = [
  {
    id: "req-1",
    communityId: "test-community",
    driverName: "John Driver",
    requestedAt: new Date(),
    status: "dispatched",
    pickupLocation: "Clubhouse",
    phone: "555-1234",
  },
];

describe("Driver API authentication", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/driver/[id]/assignments", () => {
    it("MUST return 401 without driver session/PIN auth", async () => {
      const { prisma } = await import("@/lib/server/prisma");
      vi.mocked(prisma.tramDriver.findUnique).mockResolvedValue(MOCK_DRIVER as any);
      vi.mocked(prisma.tramRequest.findMany).mockResolvedValue(MOCK_ASSIGNMENTS as any);

      const { GET } = await import(
        "@/app/api/driver/[id]/assignments/route"
      );

      const request = new Request(
        "http://localhost/api/driver/driver-1/assignments",
        { method: "GET" }
      );

      const response = await GET(request, {
        params: Promise.resolve({ id: "driver-1" }),
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.assignments).toBeUndefined();
    });
  });

  describe("PATCH /api/driver/[id]/assignments/[requestId]", () => {
    it("MUST return 401 without driver session/PIN auth", async () => {
      const { prisma } = await import("@/lib/server/prisma");
      vi.mocked(prisma.tramDriver.findUnique).mockResolvedValue(MOCK_DRIVER as any);
      vi.mocked(prisma.tramRequest.findUnique).mockResolvedValue(
        MOCK_ASSIGNMENTS[0] as any
      );
      vi.mocked(prisma.tramRequest.update).mockResolvedValue({
        ...MOCK_ASSIGNMENTS[0],
        status: "en_route",
      } as any);

      const { PATCH } = await import(
        "@/app/api/driver/[id]/assignments/[requestId]/route"
      );

      const request = new Request(
        "http://localhost/api/driver/driver-1/assignments/req-1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "en_route" }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "driver-1", requestId: "req-1" }),
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(prisma.tramRequest.update).not.toHaveBeenCalled();
    });
  });
});
