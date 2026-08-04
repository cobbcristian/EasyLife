import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/server/db";
import { verifyPassword } from "@/lib/server/password";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { logEvent } from "@/lib/server/records";
import { isCommunityStaging } from "@/lib/server/staging";
import {
  SESSION_COOKIE,
  createSessionToken,
  homeForRole,
  sessionCookieOptions,
} from "@/lib/server/auth";
import { createMfaPendingToken } from "@/lib/server/mfa";
import {
  ACTIVE_COMMUNITY_COOKIE,
  DEMO_TENANT_COOKIE,
  getDemoTenantById,
  resolveDemoTenantFromCookieHeader,
  tenantByCommunityId,
  userBelongsToDemoTenant,
} from "@/lib/tenant";

export async function POST(request: Request) {
  if (!rateLimit(`login:${clientIp(request)}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: { email?: string; password?: string; demoTenantId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  if (user.status === "frozen") {
    return NextResponse.json(
      { error: "This account is frozen. Contact your club administrator." },
      { status: 403 },
    );
  }

  if (user.status === "pending") {
    return NextResponse.json(
      {
        error:
          "Your registration is pending approval. You will be able to sign in after association management approves your account.",
      },
      { status: 403 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  // Prefer the tenant shown on the login page (avoids stale duplicate cookies
  // from switching /go/[tenant] on the same Vercel host).
  const tenant =
    getDemoTenantById(body.demoTenantId) ??
    resolveDemoTenantFromCookieHeader(
      request.headers.get("host"),
      cookieHeader,
    );
  if (tenant && !userBelongsToDemoTenant(user.communityId, tenant)) {
    const userTenant = tenantByCommunityId(user.communityId);
    return NextResponse.json(
      {
        error: `This ${tenant.productName} demo is limited to ${tenant.communityName} members and staff. Use a ${tenant.productName} demo login.`,
        suggestedGo: userTenant ? `/go/${userTenant.id}` : undefined,
      },
      { status: 403 },
    );
  }

  if (
    user.role !== "admin" &&
    user.communityId &&
    (await isCommunityStaging(user.communityId))
  ) {
    return NextResponse.json(
      { error: "This club is in staging mode. Member access is not open yet." },
      { status: 403 },
    );
  }

  if (user.mfaEnabled) {
    const mfaToken = await createMfaPendingToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      communityId: user.communityId,
    });
    return NextResponse.json({
      ok: true,
      mfaRequired: true,
      mfaToken,
    });
  }

  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    communityId: user.communityId,
  });

  await logEvent({
    communityId: user.communityId,
    userName: user.name,
    action: "Login",
    detail: `${user.role} portal`,
  });

  const redirectTo = homeForRole(user.role, user.communityId);
  const response = NextResponse.json({ ok: true, role: user.role, redirectTo });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  if (tenant) {
    response.cookies.set(ACTIVE_COMMUNITY_COOKIE, tenant.communityId, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
    response.cookies.set(DEMO_TENANT_COOKIE, tenant.id, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
