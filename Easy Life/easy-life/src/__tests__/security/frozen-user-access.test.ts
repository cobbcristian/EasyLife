/**
 * Security regression tests for frozen/suspended user access revocation.
 *
 * These tests prove that on da0523a:
 * - A user whose status changed to "frozen" after login retains access
 * - The system trusts the JWT without rechecking DB status
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SessionPayload } from "@/lib/types";

const ACTIVE_USER_SESSION: SessionPayload = {
  sub: "user-frozen-later",
  email: "frozen@example.com",
  role: "member",
  name: "Frozen User",
  communityId: "test-community",
};

const FROZEN_USER_DB_RECORD = {
  id: "user-frozen-later",
  email: "frozen@example.com",
  password: "hashed",
  role: "member",
  name: "Frozen User",
  communityId: "test-community",
  status: "frozen",
  createdAt: new Date(),
};

vi.mock("@/lib/server/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    memberCharge: {
      findMany: vi.fn(),
    },
    community: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server/records", () => ({
  ensureRecordsSeeded: vi.fn(),
  listMemberCharges: vi.fn(() => []),
}));

vi.mock("@/lib/server/db", () => ({
  getCommunityById: vi.fn(() => ({ name: "Test Community" })),
  getMemberProfile: vi.fn(() => ({})),
  getAccountProfile: vi.fn(() => ({})),
  ensureSeeded: vi.fn(),
}));

vi.mock("@/lib/server/mobile-auth", () => ({
  getMobileSession: vi.fn(),
  bearerToken: vi.fn(() => "valid-token"),
}));

vi.mock("@/lib/server/local-pros", () => ({
  listChatThreadsForUser: vi.fn(() => []),
}));

vi.mock("@/lib/server/member-api-store", () => ({
  listGroupsForMember: vi.fn(() => []),
  getMemberProfile: vi.fn(() => ({})),
}));

describe("Frozen user access revocation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Protected route access with frozen status", () => {
    it("MUST reject access when user status is frozen (re-check DB)", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { prisma } = await import("@/lib/server/prisma");

      vi.mocked(getSession).mockResolvedValue(ACTIVE_USER_SESSION);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        FROZEN_USER_DB_RECORD as any
      );

      const { GET } = await import("@/app/api/member/charges/route");

      const response = await GET();

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toMatch(/frozen|suspended|deactivated/i);
    });

    it("MUST reject directory access for frozen users", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { prisma } = await import("@/lib/server/prisma");

      vi.mocked(getSession).mockResolvedValue(ACTIVE_USER_SESSION);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        FROZEN_USER_DB_RECORD as any
      );
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const { GET } = await import("@/app/api/member/directory/route");

      const response = await GET();

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.members).toBeUndefined();
    });
  });

  describe("Mobile API access with frozen status", () => {
    it("MUST reject mobile API when user becomes frozen", async () => {
      const { prisma } = await import("@/lib/server/prisma");
      const { getMobileSession } = await import("@/lib/server/mobile-auth");

      vi.mocked(getMobileSession).mockResolvedValue(ACTIVE_USER_SESSION);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        FROZEN_USER_DB_RECORD as any
      );

      const { GET } = await import("@/app/api/mobile/messages/route");

      const request = new Request("http://localhost/api/mobile/messages", {
        method: "GET",
        headers: { Authorization: "Bearer valid-token" },
      });

      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });
});
