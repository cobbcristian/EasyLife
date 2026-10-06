import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
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
    const previousNode = process.env.NODE_ENV;
    const previousFlag = process.env.ALLOW_DEMO_PAYMENTS;
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_DEMO_PAYMENTS;
    expect(isDemoPaymentAllowed()).toBe(false);
    process.env.ALLOW_DEMO_PAYMENTS = "1";
    expect(isDemoPaymentAllowed()).toBe(true);
    process.env.NODE_ENV = previousNode;
    if (previousFlag === undefined) delete process.env.ALLOW_DEMO_PAYMENTS;
    else process.env.ALLOW_DEMO_PAYMENTS = previousFlag;
  });
});
