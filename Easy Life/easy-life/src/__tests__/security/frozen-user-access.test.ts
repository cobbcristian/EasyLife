/**
 * Security regression tests for frozen/suspended user access revocation.
 *
 * These tests prove that on da0523a:
 * - A user whose status changed to "frozen" after login retains access
 * - The system trusts the JWT without rechecking DB status
 *
 * EVIDENCE - Routes do NOT check user.status from DB:
 *
 * 1. getSession() in auth.ts (lines 129-132):
 *    export async function getSession(): Promise<SessionPayload | null> {
 *      const store = await cookies();
 *      return verifySessionToken(store.get(SESSION_COOKIE)?.value);
 *    }
 *    → Only verifies JWT signature, does NOT query DB for user.status
 *
 * 2. SessionPayload in types.ts (lines 202-208):
 *    export interface SessionPayload {
 *      sub: string;
 *      email: string;
 *      role: AuthRole;
 *      name: string;
 *      communityId?: string | null;
 *    }
 *    → No `status` field exists in the JWT payload
 *
 * 3. member/charges/route.ts (lines 6-8):
 *    const session = await getSession();
 *    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *    → Only checks if session exists, not user.status
 *
 * 4. member/directory/route.ts (lines 6-16):
 *    const session = await getSession();
 *    if (!session || !["member", "board", ...].includes(session.role)) {
 *    → Only checks role, not user.status
 *
 * 5. member/profile/route.ts (lines 10-11):
 *    const session = await getSession();
 *    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *    → Only checks if session exists, not user.status
 *
 * 6. getMobileSession() in mobile-auth.ts (lines 9-12):
 *    export async function getMobileSession(request: Request): Promise<SessionPayload | null> {
 *      return verifySessionToken(bearerToken(request));
 *    }
 *    → Only verifies JWT, does NOT query DB
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
  updateMemberProfile: vi.fn(() => ({})),
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
      /**
       * Route: member/charges/route.ts lines 6-8
       * Only checks: if (!session) return 401
       * Does NOT check: user.status in DB
       */
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
      /**
       * Route: member/directory/route.ts lines 6-16
       * Only checks: session exists and role is valid
       * Does NOT check: user.status in DB
       */
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

    it("MUST reject profile access for suspended users", async () => {
      /**
       * Route: member/profile/route.ts lines 10-11
       * Only checks: if (!session) return 401
       * Does NOT check: user.status in DB
       */
      const { getSession } = await import("@/lib/server/auth");
      const { prisma } = await import("@/lib/server/prisma");

      const suspendedUser = { ...FROZEN_USER_DB_RECORD, status: "suspended" };
      vi.mocked(getSession).mockResolvedValue(ACTIVE_USER_SESSION);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(suspendedUser as any);

      const { GET } = await import("@/app/api/member/profile/route");

      const response = await GET();

      expect(response.status).toBe(401);
    });
  });

  describe("Mobile API access with frozen status", () => {
    it("MUST reject mobile API when user becomes frozen", async () => {
      /**
       * Route: mobile/messages/route.ts lines 6-9
       * Uses: getMobileSession(request) which only verifies JWT
       * Does NOT check: user.status in DB
       */
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
