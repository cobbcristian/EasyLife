import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("jose", () => ({
  SignJWT: class {
    setProtectedHeader() {
      return this;
    }
    setIssuedAt() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    async sign() {
      return "signed";
    }
  },
  jwtVerify: vi.fn(),
}));

import { jwtVerify } from "jose";
import { prisma } from "@/lib/server/prisma";
import { verifyActiveSessionToken } from "@/lib/server/auth";

describe("verifyActiveSessionToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the account is frozen", async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        sub: "user-1",
        email: "frozen@example.com",
        role: "member",
        name: "Frozen",
        communityId: "club-a",
      },
      protectedHeader: { alg: "HS256" },
      key: new Uint8Array(),
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      status: "frozen",
    } as never);

    await expect(verifyActiveSessionToken("tok")).resolves.toBeNull();
  });

  it("returns null when the account is pending approval", async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        sub: "user-2",
        email: "pending@example.com",
        role: "member",
        name: "Pending",
        communityId: "club-a",
      },
      protectedHeader: { alg: "HS256" },
      key: new Uint8Array(),
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      status: "pending",
    } as never);

    await expect(verifyActiveSessionToken("tok")).resolves.toBeNull();
  });

  it("returns the JWT session for active accounts", async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        sub: "user-3",
        email: "live@example.com",
        role: "member",
        name: "Live",
        communityId: "club-b",
      },
      protectedHeader: { alg: "HS256" },
      key: new Uint8Array(),
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      status: "active",
    } as never);

    await expect(verifyActiveSessionToken("tok")).resolves.toEqual({
      sub: "user-3",
      email: "live@example.com",
      role: "member",
      name: "Live",
      communityId: "club-b",
    });
  });
});
