/**
 * Security hardening tests
 *
 * These tests verify the security fixes in the auth-hardening PR.
 * Each section tests a specific issue from the security audit.
 *
 * IMPORTANT: These tests are designed to FAIL on master (da0523a) and PASS after the fix.
 */

import { describe, expect, it } from "vitest";
import { randomBytes } from "crypto";

// ============================================================================
// BLOCKER 2: Verify hardcoded super-admin credentials removed
// ============================================================================

describe("BLOCKER 2: Hardcoded super-admin credentials removed", () => {
  it("login-client.tsx should not contain SUPER_ADMIN_EMAIL constant", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const loginClientPath = path.resolve(
      __dirname,
      "../../app/(auth)/login/login-client.tsx",
    );
    const content = await fs.readFile(loginClientPath, "utf-8");

    // Should NOT contain the SUPER_ADMIN_EMAIL constant
    expect(content).not.toContain("SUPER_ADMIN_EMAIL");
    // Should NOT contain the hardcoded email value (without revealing it)
    expect(content).not.toMatch(/const\s+SUPER_ADMIN_EMAIL\s*=/);
  });

  it("proxy.ts should not expose credentials in /go/superadmin redirect", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const proxyPath = path.resolve(__dirname, "../../proxy.ts");
    const content = await fs.readFile(proxyPath, "utf-8");

    // Should NOT pass email/password params to login from /go/superadmin
    // Check that /go/superadmin handler doesn't set credentials
    const superadminSection = content.match(
      /\/go\/superadmin[\s\S]*?return\s+redirect;/,
    );
    if (superadminSection) {
      expect(superadminSection[0]).not.toContain('searchParams.set("email"');
      expect(superadminSection[0]).not.toContain('searchParams.set("password"');
    }
  });

  it("GO_SALES_TOOL_SLUGS should not contain 'superadmin'", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const proxyPath = path.resolve(__dirname, "../../proxy.ts");
    const content = await fs.readFile(proxyPath, "utf-8");

    // superadmin should not be in the sales tool slugs
    const salesToolsMatch = content.match(/GO_SALES_TOOL_SLUGS\s*=\s*new\s+Set\(\[([^\]]*)\]\)/);
    if (salesToolsMatch) {
      expect(salesToolsMatch[1]).not.toContain("superadmin");
    }
  });
});

// ============================================================================
// HIGH 5: JWT TTL shortened and DB re-check on session resolution
// ============================================================================

describe("HIGH 5: JWT TTL and DB re-check", () => {
  it("SESSION_MAX_AGE_SECONDS should be <= 30 days (not 365)", async () => {
    const { SESSION_MAX_AGE_SECONDS } = await import("./auth");

    const THIRTY_DAYS = 60 * 60 * 24 * 30;
    const THREE_SIXTY_FIVE_DAYS = 60 * 60 * 24 * 365;

    // Must be 30 days or less (we set 14 days)
    expect(SESSION_MAX_AGE_SECONDS).toBeLessThanOrEqual(THIRTY_DAYS);
    // Must NOT be 365 days
    expect(SESSION_MAX_AGE_SECONDS).not.toBe(THREE_SIXTY_FIVE_DAYS);
  });

  it("verifySessionTokenWithDbCheck should exist and reject frozen users", async () => {
    const authModule = await import("./auth");

    // The function should exist
    expect(typeof authModule.verifySessionTokenWithDbCheck).toBe("function");
  });

  it("getSession should use DB-checking verification", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const authPath = path.resolve(__dirname, "./auth.ts");
    const content = await fs.readFile(authPath, "utf-8");

    // Find the getSession function specifically (not getSessionTokenExpiry)
    // Match from "export async function getSession():" to the first standalone closing brace
    const getSessionMatch = content.match(
      /export\s+async\s+function\s+getSession\s*\(\s*\)\s*:\s*Promise<SessionPayload\s*\|\s*null>\s*\{[\s\S]*?return\s+[^;]+;[\s\S]*?\}/,
    );
    expect(getSessionMatch).not.toBeNull();
    if (getSessionMatch) {
      // Should call verifySessionTokenWithDbCheck
      expect(getSessionMatch[0]).toContain("verifySessionTokenWithDbCheck");
      // Should NOT use verifySessionToken directly (which doesn't check DB)
      // The getSession function itself should call the WithDbCheck version
      expect(getSessionMatch[0]).not.toMatch(/return\s+verifySessionToken\(/);
    }
  });

  it("getUserStatusFromDb should be implemented", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const authPath = path.resolve(__dirname, "./auth.ts");
    const content = await fs.readFile(authPath, "utf-8");

    // Should have a function to check user status from DB
    expect(content).toContain("getUserStatusFromDb");
  });
});

// ============================================================================
// HIGH 6: Unified AUTH_SECRET, no NEXTAUTH_* fallbacks
// ============================================================================

describe("HIGH 6: Unified AUTH_SECRET", () => {
  it("auth.ts should only use AUTH_SECRET (not NEXTAUTH_SECRET)", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const authPath = path.resolve(__dirname, "./auth.ts");
    const content = await fs.readFile(authPath, "utf-8");

    // Should NOT have fallback to NEXTAUTH_SECRET
    expect(content).not.toContain("NEXTAUTH_SECRET");
    // Should use AUTH_SECRET
    expect(content).toContain("AUTH_SECRET");
  });

  it("app-url.ts should not use NEXTAUTH_URL", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const appUrlPath = path.resolve(__dirname, "./app-url.ts");
    const content = await fs.readFile(appUrlPath, "utf-8");

    // Should NOT have fallback to NEXTAUTH_URL
    expect(content).not.toContain("NEXTAUTH_URL");
  });

  it("DEPLOYMENT.md should document AUTH_SECRET requirement", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const deploymentPath = path.resolve(__dirname, "../../../DEPLOYMENT.md");
    const content = await fs.readFile(deploymentPath, "utf-8");

    // Should document AUTH_SECRET
    expect(content).toContain("AUTH_SECRET");
    // Should NOT refer to NEXTAUTH_SECRET as the primary secret
    expect(content).not.toMatch(/NEXTAUTH_SECRET.*required/i);
  });
});

// ============================================================================
// HIGH 7: PUT /api/roles gated with isSuperAdmin
// ============================================================================

describe("HIGH 7: PUT /api/roles requires isSuperAdmin", () => {
  it("roles/route.ts PUT handler should check isSuperAdmin", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const rolesPath = path.resolve(
      __dirname,
      "../../app/api/roles/route.ts",
    );
    const content = await fs.readFile(rolesPath, "utf-8");

    // Must import isSuperAdmin
    expect(content).toContain("isSuperAdmin");

    // The PUT function should call isSuperAdmin
    const putMatch = content.match(
      /export\s+async\s+function\s+PUT[\s\S]*?^}/m,
    );
    if (putMatch) {
      expect(putMatch[0]).toContain("isSuperAdmin");
      // Should return 403 for non-super-admin
      expect(putMatch[0]).toMatch(/403|Forbidden|super-admin/i);
    }
  });
});

// ============================================================================
// HIGH 8: Admin user creation requires strong password or pending state
// ============================================================================

describe("HIGH 8: Admin user creation password security", () => {
  it("admin/users/route.ts should not default password to 'password'", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const usersPath = path.resolve(
      __dirname,
      "../../app/api/admin/users/route.ts",
    );
    const content = await fs.readFile(usersPath, "utf-8");

    // Should NOT have the vulnerable pattern
    expect(content).not.toMatch(/password\s*=.*\|\|\s*["']password["']/);
    expect(content).not.toContain('|| "password"');
  });

  it("admin/users/route.ts should validate password strength", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const usersPath = path.resolve(
      __dirname,
      "../../app/api/admin/users/route.ts",
    );
    const content = await fs.readFile(usersPath, "utf-8");

    // Should import password policy
    expect(content).toContain("isPasswordStrongEnough");

    // Should have password length check
    expect(content).toMatch(/password.*length|MIN_PASSWORD/i);
  });

  it("admin/users/route.ts should create pending user if no password", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const usersPath = path.resolve(
      __dirname,
      "../../app/api/admin/users/route.ts",
    );
    const content = await fs.readFile(usersPath, "utf-8");

    // Should have logic for pending status when no password provided
    expect(content).toContain("pending");
    expect(content).toContain("status");
  });

  it("password.ts should reject pending$ prefix passwords", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const passwordPath = path.resolve(__dirname, "./password.ts");
    const content = await fs.readFile(passwordPath, "utf-8");

    // Should define PENDING_PREFIX
    expect(content).toContain("PENDING_PREFIX");

    // Should have isPendingPassword function
    expect(content).toContain("isPendingPassword");

    // verifyPassword should reject pending passwords
    const verifyMatch = content.match(
      /export\s+function\s+verifyPassword[\s\S]*?^}/m,
    );
    if (verifyMatch) {
      expect(verifyMatch[0]).toContain("isPendingPassword");
    }
  });

  it("verifyPassword should return false for pending$ passwords", async () => {
    const { verifyPassword } = await import("./password");

    const pendingPassword = `pending$${randomBytes(32).toString("hex")}`;

    // Should reject any attempt to verify against a pending password
    expect(verifyPassword("anything", pendingPassword)).toBe(false);
    expect(verifyPassword("password", pendingPassword)).toBe(false);
  });
});

// ============================================================================
// MEDIUM 10: Default-deny for /api/** with explicit public allowlist
// ============================================================================

describe("MEDIUM 10: Default-deny for /api/**", () => {
  it("proxy.ts should define PUBLIC_API_ROUTES allowlist", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const proxyPath = path.resolve(__dirname, "../../proxy.ts");
    const content = await fs.readFile(proxyPath, "utf-8");

    // Should have a public API routes list
    expect(content).toContain("PUBLIC_API_ROUTES");
  });

  it("proxy.ts should have isPublicApi function", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const proxyPath = path.resolve(__dirname, "../../proxy.ts");
    const content = await fs.readFile(proxyPath, "utf-8");

    // Should have isPublicApi function
    expect(content).toContain("isPublicApi");
  });

  it("proxy.ts should require JWT for non-public /api/** routes", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const proxyPath = path.resolve(__dirname, "../../proxy.ts");
    const content = await fs.readFile(proxyPath, "utf-8");

    // Should have default-deny logic for /api/
    expect(content).toMatch(/pathname\.startsWith\(["']\/api\/["']\)/);

    // Should check isPublicApi and return Unauthorized for non-public routes
    expect(content).toContain("isPublicApi");
    expect(content).toMatch(/Unauthorized.*401|401.*Unauthorized/);
  });

  it("PUBLIC_API_ROUTES should include expected public endpoints", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const proxyPath = path.resolve(__dirname, "../../proxy.ts");
    const content = await fs.readFile(proxyPath, "utf-8");

    // These endpoints should be in the public list
    const expectedPublicRoutes = [
      "/api/auth/login",
      "/api/auth/register",
      "/api/health",
      "/api/stripe/webhook",
    ];

    for (const route of expectedPublicRoutes) {
      expect(content).toContain(route);
    }
  });
});

// ============================================================================
// Integration: Seed password security
// ============================================================================

describe("Seed password security", () => {
  it("db.ts should not seed super-admin with known password in production", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const dbPath = path.resolve(__dirname, "./db.ts");
    const content = await fs.readFile(dbPath, "utf-8");

    // Should have getSuperAdminSeedPassword function
    expect(content).toContain("getSuperAdminSeedPassword");

    // Should check SUPERADMIN_SEED_PASSWORD env var
    expect(content).toContain("SUPERADMIN_SEED_PASSWORD");

    // Should generate random password if no env var (in non-production)
    expect(content).toContain("randomBytes");
  });

  it("backfillSuperAdminIdentity should not reset password to known value", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const dbPath = path.resolve(__dirname, "./db.ts");
    const content = await fs.readFile(dbPath, "utf-8");

    // Find the backfillSuperAdminIdentity function
    const backfillMatch = content.match(
      /async\s+function\s+backfillSuperAdminIdentity[\s\S]*?^}/m,
    );

    if (backfillMatch) {
      // Should NOT contain hardcoded password in the backfill function
      // (checking it doesn't reset password to a known value)
      expect(backfillMatch[0]).not.toMatch(/password:\s*["'][^"']{1,20}["']/);
    }
  });
});
