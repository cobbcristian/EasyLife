/**
 * Security regression tests for tenant isolation.
 *
 * These tests prove that on da0523a:
 * - A member of community A can access community B's data
 * - Directory, messages, and charges are not properly scoped
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

const COMMUNITY_B_MEMBERS = [
  {
    id: "user-b1",
    name: "Secret Member B1",
    email: "secret@community-b.com",
    communityId: "community-b",
    role: "member",
  },
  {
    id: "user-b2",
    name: "Secret Member B2",
    email: "secret2@community-b.com",
    communityId: "community-b",
    role: "member",
  },
];

const COMMUNITY_B_CHARGES = [
  {
    id: "charge-b1",
    communityId: "community-b",
    memberEmail: "secret@community-b.com",
    memberName: "Secret Member B1",
    description: "Confidential charge",
    amount: 500,
    status: "due",
    createdAt: new Date(),
  },
];

const COMMUNITY_B_MESSAGES = [
  {
    id: "msg-b1",
    communityId: "community-b",
    channel: "board",
    author: "Board B",
    authorEmail: "board@community-b.com",
    body: "Confidential board discussion",
    createdAt: new Date(),
  },
];

vi.mock("@/lib/server/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    memberCharge: {
      findMany: vi.fn(),
    },
    privateMessage: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server/records", () => ({
  ensureRecordsSeeded: vi.fn(),
  listMemberCharges: vi.fn(),
  listPrivateMessages: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  getCommunityById: vi.fn(() => ({ name: "Community A" })),
}));

vi.mock("@/lib/server/four-club-demo-content", () => ({
  ensureFourClubDemoContent: vi.fn(),
}));

describe("Tenant isolation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Directory tenant isolation", () => {
    it("MUST NOT return members from other communities", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { prisma } = await import("@/lib/server/prisma");

      vi.mocked(getSession).mockResolvedValue(COMMUNITY_A_MEMBER);
      vi.mocked(prisma.user.findMany).mockResolvedValue(
        COMMUNITY_B_MEMBERS as any
      );

      const { GET } = await import("@/app/api/member/directory/route");

      const response = await GET();
      const data = await response.json();

      if (response.status === 200 && data.members) {
        const leakedMembers = data.members.filter(
          (m: any) =>
            m.email?.includes("community-b") ||
            m.name?.includes("Secret Member B")
        );
        expect(leakedMembers).toHaveLength(0);
      }
    });
  });

  describe("Messages tenant isolation", () => {
    it("MUST NOT return messages from other communities", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { listPrivateMessages } = await import("@/lib/server/records");

      const boardMemberA = { ...COMMUNITY_A_MEMBER, role: "board" as const };
      vi.mocked(getSession).mockResolvedValue(boardMemberA);
      vi.mocked(listPrivateMessages).mockResolvedValue(
        COMMUNITY_B_MESSAGES as any
      );

      const { GET } = await import("@/app/api/messages/route");

      const request = new Request(
        "http://localhost/api/messages?channel=board",
        { method: "GET" }
      );

      const response = await GET(request);
      const data = await response.json();

      if (response.status === 200 && data.messages) {
        const leakedMessages = data.messages.filter(
          (m: any) =>
            m.body?.includes("Confidential") ||
            m.author?.includes("Board B")
        );
        expect(leakedMessages).toHaveLength(0);
      }
    });

    it("MUST pass community scope to message query", async () => {
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

      expect(listPrivateMessages).toHaveBeenCalledWith(
        "board",
        "community-a"
      );
    });
  });

  describe("Charges tenant isolation", () => {
    it("MUST NOT return charges from other communities", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { listMemberCharges } = await import("@/lib/server/records");

      vi.mocked(getSession).mockResolvedValue(COMMUNITY_A_MEMBER);
      vi.mocked(listMemberCharges).mockResolvedValue(COMMUNITY_B_CHARGES as any);

      const { GET } = await import("@/app/api/member/charges/route");

      const response = await GET();
      const data = await response.json();

      if (response.status === 200 && data.charges) {
        const leakedCharges = data.charges.filter(
          (c: any) =>
            c.communityId === "community-b" ||
            c.memberEmail?.includes("community-b")
        );
        expect(leakedCharges).toHaveLength(0);
      }
    });

    it("MUST scope charges query to user's community AND email", async () => {
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
