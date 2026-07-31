import { describe, expect, it } from "vitest";
import { authorizeCronRequest } from "@/lib/server/cron-auth";

function cronRequest(authHeader?: string): Request {
  return new Request("http://localhost/api/cron/reminders", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("authorizeCronRequest", () => {
  it("allows cron when secret is unset outside production", () => {
    const dev = authorizeCronRequest(cronRequest(), {
      cronSecret: undefined,
      nodeEnv: "development",
    });
    expect(dev.ok).toBe(true);
    if (dev.ok) expect(dev.secured).toBe(false);
  });

  it("rejects unset secret in production", () => {
    const prod = authorizeCronRequest(cronRequest(), {
      cronSecret: undefined,
      nodeEnv: "production",
    });
    expect(prod.ok).toBe(false);
    if (!prod.ok) expect(prod.status).toBe(503);
  });

  it("rejects wrong bearer token when secret is set", () => {
    const result = authorizeCronRequest(cronRequest("Bearer wrong"), {
      cronSecret: "secret123",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("accepts matching bearer token", () => {
    const result = authorizeCronRequest(cronRequest("Bearer secret123"), {
      cronSecret: "secret123",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.secured).toBe(true);
  });
});
