/**
 * Security regression tests for tenant isolation.
 *
 * AUDIT RESULT: Routes properly scope queries by communityId.
 * These tests verify the query shape rather than mock leak behavior.
 *
 * Route evidence:
 * - Directory (route.ts:17-27): `prisma.user.findMany({ where: { communityId, ... } })`
 * - Messages (route.ts:33): `listPrivateMessages(channel, session.communityId)` →
 *   records.ts:3207-3208: `where: { channel, communityId: scope(communityId) }`
 * - Charges (route.ts:11-14): `listMemberCharges({ communityId: session.communityId, memberEmail: session.email })`
 *   records.ts:1003-1007: `where: { communityId: scope(opts.communityId), memberEmail: opts.memberEmail }`
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SessionPayload } from "@/lib/types";

const COMMUNITY_A_MEMBER: SessionPayload = {
  sub: "member-a",
  email: "member@community-a.com",
  role: "member",
  name: "Member A",
  communityId: "community-a",
};

vi.mock("@/lib/server/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(() => []),
    },
  },
}));

vi.mock("@/lib/server/records", () => ({
  ensureRecordsSeeded: vi.fn(),
  listMemberCharges: vi.fn(() => []),
  listPrivateMessages: vi.fn(() => []),
}));

vi.mock("@/lib/server/db", () => ({
  getCommunityById: vi.fn(() => ({ name: "Community A" })),
}));

vi.mock("@/lib/server/four-club-demo-content", () => ({
  ensureFourClubDemoContent: vi.fn(),
}));

describe("Tenant isolation - query shape verification", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Directory", () => {
    it("scopes directory query to session.communityId (PASSES on da0523a - not a hole)", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { prisma } = await import("@/lib/server/prisma");

      vi.mocked(getSession).mockResolvedValue(COMMUNITY_A_MEMBER);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const { GET } = await import("@/app/api/member/directory/route");

      await GET();

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            communityId: "community-a",
          }),
        })
      );
    });
  });

  describe("Messages", () => {
    it("passes session.communityId to listPrivateMessages (PASSES on da0523a - not a hole)", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { listPrivateMessages } = await import("@/lib/server/records");

      const boardMemberA = { ...COMMUNITY_A_MEMBER, role: "board" as const };
      vi.mocked(getSession).mockResolvedValue(boardMemberA);
      vi.mocked(listPrivateMessages).mockResolvedValue([]);

      const { GET } = await import("@/app/api/messages/route");

      const request = new Request(
        "http://localhost/api/messages?channel=board",
        { method: "GET" }
      );

      await GET(request);

      expect(listPrivateMessages).toHaveBeenCalledWith("board", "community-a");
    });
  });

  describe("Charges", () => {
    it("scopes charges query to session.communityId AND session.email (PASSES on da0523a - not a hole)", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { listMemberCharges } = await import("@/lib/server/records");

      vi.mocked(getSession).mockResolvedValue(COMMUNITY_A_MEMBER);
      vi.mocked(listMemberCharges).mockResolvedValue([]);

      const { GET } = await import("@/app/api/member/charges/route");

      await GET();

      expect(listMemberCharges).toHaveBeenCalledWith({
        communityId: "community-a",
        memberEmail: "member@community-a.com",
      });
    });
  });
});
