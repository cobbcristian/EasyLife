import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it, vi } from "vitest";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("security gate", () => {
  it("does not return password-reset secrets to the browser", () => {
    const route = source("src/app/api/auth/forgot-password/route.ts");
    expect(route).not.toMatch(/resetUrl:/);
    expect(route).not.toMatch(/\btoken,/);
    expect(route).not.toMatch(/\bcode,/);
    expect(route).toMatch(/sendEmail\(/);
    expect(route).toMatch(/ok: true, message: PUBLIC_MESSAGE/);
  });

  it("does not print a shared password on the login screen", () => {
    const login = source("src/app/(auth)/login/login-client.tsx");
    expect(login).not.toMatch(/>password<\/span>/);
  });

  it("refuses to mark a charge paid without a confirmed payment", () => {
    const route = source("src/app/api/member/charges/mark-paid/route.ts");
    expect(route).toMatch(/paymentIntents\.retrieve/);
    expect(route).toMatch(/isDemoPaymentAllowed\(\)/);
    expect(route).toMatch(/Payment has not been confirmed/);
  });

  it("rate-limits driver PIN attempts and does not reveal whether the driver exists", () => {
    const route = source("src/app/api/driver/[id]/auth/route.ts");
    expect(route).toMatch(/rateLimit\(/);
    expect(route).not.toMatch(/Driver not found/);
    expect(route).toMatch(/timingSafeEqual/);
  });

  it("keeps demo payments off in production unless explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_DEMO_PAYMENTS", "");
    try {
      expect(isDemoPaymentAllowed()).toBe(false);
      vi.stubEnv("ALLOW_DEMO_PAYMENTS", "1");
      expect(isDemoPaymentAllowed()).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("clears Barnaby chats when an account is deleted (email-reuse leak)", () => {
    const deleteAccount = source("src/lib/server/db.ts");
    expect(deleteAccount).toMatch(/purgeAiChatsForEmail/);
    const rejectPending = source("src/lib/server/member-enrollment.ts");
    expect(rejectPending).toMatch(/purgeAiChatsForEmail/);
  });
});
