import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    provider: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/server/dining", () => ({
  diningProviderEmail: vi.fn((id: string) =>
    id === "club-a" ? "dining@club-a.test" : "",
  ),
}));

import { diningProviderEmail } from "@/lib/server/dining";
import { prisma } from "@/lib/server/prisma";
import { resolvePosSyncProviderEmail } from "@/lib/server/pos-sync-auth";

describe("resolvePosSyncProviderEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a provider email that belongs to another club", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.provider.findFirst).mockResolvedValue(null);

    await expect(
      resolvePosSyncProviderEmail({
        communityId: "club-a",
        requestedEmail: "dining@club-b.test",
      }),
    ).resolves.toBeNull();
  });

  it("accepts a provider user email in the same club", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      email: "dining@club-a.test",
    } as never);

    await expect(
      resolvePosSyncProviderEmail({
        communityId: "club-a",
        requestedEmail: "dining@club-a.test",
      }),
    ).resolves.toBe("dining@club-a.test");
  });

  it("falls back to club dining email when none requested", async () => {
    vi.mocked(prisma.provider.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    await expect(
      resolvePosSyncProviderEmail({ communityId: "club-a" }),
    ).resolves.toBe("dining@club-a.test");
    expect(diningProviderEmail).toHaveBeenCalledWith("club-a");
  });
});
