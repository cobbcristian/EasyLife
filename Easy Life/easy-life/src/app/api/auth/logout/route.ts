import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/server/auth";
import {
  ACTIVE_COMMUNITY_COOKIE,
  DEMO_TENANT_COOKIE,
  resolveDemoTenantFromCookieHeader,
  tenantByCommunityId,
  type DemoTenant,
} from "@/lib/tenant";

function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}

function lockDemoTenant(response: NextResponse, tenant: DemoTenant) {
  const secure = process.env.NODE_ENV === "production";
  // Expire first so duplicate cookies from prior /go switches drop cleanly.
  response.cookies.set(DEMO_TENANT_COOKIE, "", {
    path: "/",
    sameSite: "lax",
    maxAge: 0,
    secure,
  });
  response.cookies.set(ACTIVE_COMMUNITY_COOKIE, "", {
    path: "/",
    sameSite: "lax",
    maxAge: 0,
    secure,
  });
  response.cookies.set(ACTIVE_COMMUNITY_COOKIE, tenant.communityId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    secure,
  });
  response.cookies.set(DEMO_TENANT_COOKIE, tenant.id, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    secure,
  });
}

function sessionTokenFromCookieHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === SESSION_COOKIE) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return undefined;
}

async function resolveLogoutTenant(request: Request): Promise<DemoTenant | null> {
  const host = request.headers.get("host");
  const cookieHeader = request.headers.get("cookie");
  const fromCookie = resolveDemoTenantFromCookieHeader(host, cookieHeader);
  if (fromCookie) return fromCookie;

  const session = await verifySessionToken(
    sessionTokenFromCookieHeader(cookieHeader),
  );
  return tenantByCommunityId(session?.communityId);
}

async function logoutResponse(request: Request) {
  const tenant = await resolveLogoutTenant(request);
  // /go/[tenant] re-locks branding and lands on the club login (not Easy Life).
  const redirectTo = tenant ? `/go/${tenant.id}` : "/login";
  const wantsJson = request.headers.get("accept")?.includes("application/json");

  const response = wantsJson
    ? NextResponse.json({ ok: true, redirectTo })
    : NextResponse.redirect(new URL(redirectTo, request.url));

  clearSession(response);
  if (tenant) lockDemoTenant(response, tenant);
  return response;
}

export async function POST(request: Request) {
  return logoutResponse(request);
}

/** Allow link / address-bar logout without 405. */
export async function GET(request: Request) {
  return logoutResponse(request);
}
