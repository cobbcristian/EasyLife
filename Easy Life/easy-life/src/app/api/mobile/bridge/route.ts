import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/server/app-url";
import {
  ACTIVE_COMMUNITY_COOKIE,
  DEMO_TENANT_COOKIE,
} from "@/lib/tenant";
import {
  SESSION_COOKIE,
  homeForRole,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/server/auth";

/**
 * Public origin for redirects. Azure RUN_FROM_PACKAGE / Node often sees an
 * internal container host (e.g. https://138a33c99b39:8080) on `request.url`,
 * which breaks the Oceanside WebView (Safari: "server can't be found").
 */
function publicOrigin(request: Request): string {
  const configured = getAppUrl().replace(/\/$/, "");
  if (configured) return configured;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (forwardedHost && !/^\d+[a-f0-9]{8,}:\d+$/i.test(forwardedHost) && !forwardedHost.includes(":8080")) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

/**
 * Exchange a mobile JWT for httpOnly session cookies, then redirect into
 * the member (or role) portal. Used by the Oceanside native WebView.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  const nextPath = url.searchParams.get("next")?.trim();
  const origin = publicOrigin(request);

  if (!token) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.redirect(new URL("/login?error=session", origin));
  }

  const destination =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : homeForRole(session.role, session.communityId);

  const response = NextResponse.redirect(new URL(destination, origin));
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);

  if (session.communityId === "oceanside-residents") {
    response.cookies.set(ACTIVE_COMMUNITY_COOKIE, "oceanside-residents", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
    response.cookies.set(DEMO_TENANT_COOKIE, "oceansideresidents", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}
