import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/cron-auth", () => ({
  authorizeCronRequest: vi.fn(() => ({ ok: true, secured: true })),
}));
vi.mock("@/lib/server/records", () => ({
  processDueReminders: vi.fn(async () => 3),
}));
vi.mock("@/lib/server/dependent-membership", () => ({
  processDependentMembershipAging: vi.fn(async () => 0),
}));
vi.mock("@/lib/server/membership-rejoin", () => ({
  processRejoinReminders: vi.fn(async () => 0),
}));
vi.mock("@/lib/server/autopay", () => ({
  processAutopayDueToday: vi.fn(async () => ({ processed: 0, failed: 0 })),
}));
vi.mock("@/lib/server/ai-chat-retention", () => ({
  purgeExpiredAiChats: vi.fn(async () => ({ agedDeleted: 0, orphanedDeleted: 0 })),
}));
vi.mock("@/lib/server/credential-lapse", () => ({
  processCredentialLapses: vi.fn(async () => 0),
}));

describe("GET /api/cron/reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs only processDueReminders when tasks=reminders", async () => {
    const { GET } = await import("./route");
    const { processDueReminders } = await import("@/lib/server/records");
    const { processAutopayDueToday } = await import("@/lib/server/autopay");

    const res = await GET(
      new Request("http://localhost/api/cron/reminders?tasks=reminders"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, tasks: "reminders", processed: 3 });
    expect(processDueReminders).toHaveBeenCalledOnce();
    expect(processAutopayDueToday).not.toHaveBeenCalled();
  });

  it("runs the full daily suite by default", async () => {
    const { GET } = await import("./route");
    const { processDueReminders } = await import("@/lib/server/records");
    const { processAutopayDueToday } = await import("@/lib/server/autopay");
    const { purgeExpiredAiChats } = await import("@/lib/server/ai-chat-retention");

    const res = await GET(new Request("http://localhost/api/cron/reminders"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.tasks).toBeUndefined();
    expect(processDueReminders).toHaveBeenCalledOnce();
    expect(processAutopayDueToday).toHaveBeenCalledOnce();
    expect(purgeExpiredAiChats).toHaveBeenCalledOnce();
  });
});
