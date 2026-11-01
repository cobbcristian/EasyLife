/**
 * Security regression tests for mobile payment service request marking.
 *
 * These tests prove that on da0523a:
 * - The mobile/payment endpoint marks service requests as completed
 *   without verifying an actual successful payment occurred
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SessionPayload } from "@/lib/types";

const MEMBER_SESSION: SessionPayload = {
  sub: "member-id",
  email: "member@example.com",
  role: "member",
  name: "Test Member",
  communityId: "test-community",
};

const SERVICE_REQUEST = {
  id: "sr-1",
  communityId: "test-community",
  memberEmail: "member@example.com",
  memberName: "Test Member",
  unit: "101",
  title: "Pool cleaning",
  category: "maintenance",
  description: "Weekly pool service",
  status: "pending",
  createdAt: new Date(),
};

vi.mock("@/lib/server/mobile-auth", () => ({
  getMobileSession: vi.fn(),
  bearerToken: vi.fn(),
}));

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    serviceRequest: {
      update: vi.fn(() =>
        Promise.resolve({ ...SERVICE_REQUEST, status: "completed" })
      ),
      findUnique: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server/local-pros", () => ({
  upsertProviderReview: vi.fn(),
}));

describe("Mobile payment verification", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/mobile/payment", () => {
    it("MUST NOT mark service request completed without actual payment verification", async () => {
      const { getMobileSession } = await import("@/lib/server/mobile-auth");
      const { prisma } = await import("@/lib/server/prisma");

      vi.mocked(getMobileSession).mockResolvedValue(MEMBER_SESSION);
      vi.mocked(prisma.serviceRequest.update).mockImplementation(() =>
        Promise.resolve({ ...SERVICE_REQUEST, status: "completed" }) as any
      );

      const { POST } = await import("@/app/api/mobile/payment/route");

      const request = new Request("http://localhost/api/mobile/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          serviceRequestId: SERVICE_REQUEST.id,
          amount: 0,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      if (data.paid === true) {
        expect(prisma.serviceRequest.update).not.toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: SERVICE_REQUEST.id },
            data: { status: "completed" },
          })
        );
      }
    });

    it("MUST verify payment exists before marking request completed", async () => {
      const { getMobileSession } = await import("@/lib/server/mobile-auth");
      const { prisma } = await import("@/lib/server/prisma");

      vi.mocked(getMobileSession).mockResolvedValue(MEMBER_SESSION);
      vi.mocked(prisma.serviceRequest.update).mockImplementation(() =>
        Promise.resolve({ ...SERVICE_REQUEST, status: "completed" }) as any
      );

      const { POST } = await import("@/app/api/mobile/payment/route");

      const request = new Request("http://localhost/api/mobile/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          serviceRequestId: SERVICE_REQUEST.id,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(402);
      const data = await response.json();
      expect(data.error).toContain("payment");
    });

    it("MUST require amount greater than 0 or payment confirmation", async () => {
      const { getMobileSession } = await import("@/lib/server/mobile-auth");
      const { prisma } = await import("@/lib/server/prisma");

      vi.mocked(getMobileSession).mockResolvedValue(MEMBER_SESSION);
      vi.mocked(prisma.serviceRequest.update).mockImplementation(() =>
        Promise.resolve({ ...SERVICE_REQUEST, status: "completed" }) as any
      );

      const { POST } = await import("@/app/api/mobile/payment/route");

      const request = new Request("http://localhost/api/mobile/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          serviceRequestId: SERVICE_REQUEST.id,
          amount: 0,
        }),
      });

      const response = await POST(request);

      expect(prisma.serviceRequest.update).not.toHaveBeenCalled();
    });
  });
});
