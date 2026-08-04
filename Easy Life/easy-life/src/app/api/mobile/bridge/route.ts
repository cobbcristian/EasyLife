import { NextResponse } from "next/server";
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
 * Exchange a mobile JWT for httpOnly session cookies, then redirect into
 * the member (or role) portal. Used by the Oceanside native WebView.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  const nextPath = url.searchParams.get("next")?.trim();

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.redirect(new URL("/login?error=session", request.url));
  }

  const destination =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : homeForRole(session.role, session.communityId);

  const response = NextResponse.redirect(new URL(destination, request.url));
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
