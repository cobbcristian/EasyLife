import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  homeForRole,
  verifySessionToken,
} from "@/lib/server/auth";
import { publicAbsoluteUrl, publicRequestOrigin } from "@/lib/server/app-url";
import { canAccessPath, forbiddenRedirect } from "@/lib/server/permissions";
import { isSessionBlockedByStaging } from "@/lib/server/staging";
import {
  ACTIVE_COMMUNITY_COOKIE,
  DEMO_TENANT_COOKIE,
  getDemoTenantById,
  resolveDemoTenantFromCookieHeader,
  type DemoTenant,
} from "@/lib/tenant";

const routeRoles: { prefixes: string[]; role: string }[] = [
  {
    prefixes: [
      "/dashboard",
      "/communities",
      "/services-activities",
      "/amenities",
      "/tournaments",
      "/apparel",
      "/reports",
      "/notifications",
      "/templates",
      "/access-logs",
      "/roles",
      "/account",
      "/help-desk",
      "/invites",
      "/users",
    ],
    role: "admin",
  },
  { prefixes: ["/provider"], role: "provider" },
  { prefixes: ["/member"], role: "member" },
  { prefixes: ["/board"], role: "board" },
  { prefixes: ["/pm"], role: "pm" },
];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function bearerToken(request: NextRequest): string | undefined {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : undefined;
}

const STAGING_EXEMPT_API_PREFIXES = [
  "/api/auth/",
  "/api/cron/",
  "/api/communities/public",
  "/api/stripe/",
  "/api/pay/",
  "/api/mobile/login",
  "/api/mobile/bridge",
  "/api/mobile/register",
  "/api/mobile/communities",
  "/api/health",
  "/api/calendar/feed",
];

function isStagingExemptApi(pathname: string) {
  return STAGING_EXEMPT_API_PREFIXES.some((p) => pathname.startsWith(p));
}

const MOBILE_PUBLIC_API = [
  "/api/mobile/login",
  "/api/mobile/bridge",
  "/api/mobile/register",
  "/api/mobile/communities",
];

function isMobilePublicApi(pathname: string) {
  return MOBILE_PUBLIC_API.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function applyDemoTenantCookies(response: NextResponse, tenant: DemoTenant) {
  const secure = process.env.NODE_ENV === "production";
  // Expire first so browsers drop any duplicate el_demo_tenant cookies from
  // earlier /go switches (secure/path mismatches), then set the active club.
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

/** Visiting /go (sales directory) unlocks the last club so titles stay Easy Life. */
function clearDemoTenantCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === "production";
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
}

function withPathnameHeader(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return requestHeaders;
}

/** Paths under /go that are sales tools, not club demo locks. */
const GO_SALES_TOOL_SLUGS = new Set(["guide", "superadmin"]);

function demoGoPath(pathname: string): DemoTenant | null {
  const match = pathname.match(/^\/go\/([a-z0-9-]+)\/?$/i);
  if (!match?.[1]) return null;
  const raw = match[1].toLowerCase();
  if (GO_SALES_TOOL_SLUGS.has(raw)) return null;
  const slug = raw.replace(/-/g, "");
  return getDemoTenantById(slug);
}

async function stagingApiBlock(request: NextRequest) {
  const token =
    request.cookies.get(SESSION_COOKIE)?.value ?? bearerToken(request);
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (session && (await isSessionBlockedByStaging(session))) {
    return NextResponse.json(
      { error: "This club is in staging mode. Member access is not open yet." },
      { status: 403 },
    );
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Sales directory / guides — clear locked club cookies so branding stays Easy Life.
  if (
    pathname === "/go" ||
    pathname === "/go/" ||
    pathname === "/go/guide" ||
    pathname === "/go/guide/"
  ) {
    const response = NextResponse.next({
      request: { headers: withPathnameHeader(request, pathname) },
    });
    clearDemoTenantCookies(response);
    return response;
  }

  // Master / platform super admin entry — unlock club branding, open Easy Life login.
  if (pathname === "/go/superadmin" || pathname === "/go/superadmin/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("email", "superadmin@gmail.com");
    url.searchParams.set("password", "password");
    const redirect = NextResponse.redirect(url);
    clearDemoTenantCookies(redirect);
    return redirect;
  }

  const goTenant = demoGoPath(pathname);
  if (goTenant) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const email = request.nextUrl.searchParams.get("email");
    const password = request.nextUrl.searchParams.get("password");
    const role = request.nextUrl.searchParams.get("role");
    url.search = "";
    if (email) url.searchParams.set("email", email);
    if (password) url.searchParams.set("password", password);
    if (role) url.searchParams.set("role", role);
    const redirect = NextResponse.redirect(url);
    applyDemoTenantCookies(redirect, goTenant);
    return redirect;
  }

  const tenant = resolveDemoTenantFromCookieHeader(
    request.headers.get("host"),
    request.headers.get("cookie"),
  );

  if (pathname.startsWith("/api/") && !isStagingExemptApi(pathname)) {
    // Member/mobile auth routes verify JWT below — fold staging into that pass.
    if (
      !(
        pathname.startsWith("/api/member/") ||
        pathname.startsWith("/api/mobile/")
      )
    ) {
      const blocked = await stagingApiBlock(request);
      if (blocked) return blocked;
    }
  }

  if (pathname.startsWith("/api/member/") || pathname.startsWith("/api/mobile/")) {
    if (isMobilePublicApi(pathname)) {
      return NextResponse.next();
    }
    const token =
      request.cookies.get(SESSION_COOKIE)?.value ?? bearerToken(request);
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (await isSessionBlockedByStaging(session)) {
      return NextResponse.json(
        { error: "This club is in staging mode. Member access is not open yet." },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

  const matched = routeRoles.find((r) => matches(pathname, r.prefixes));

  if (!matched) {
    if (tenant) {
      const response = NextResponse.next();
      applyDemoTenantCookies(response, tenant);
      return response;
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const loginUrl = publicAbsoluteUrl(request, "/login");
    loginUrl.searchParams.set("redirect", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    if (tenant) applyDemoTenantCookies(redirect, tenant);
    return redirect;
  }

  if (session.role !== matched.role) {
    return NextResponse.redirect(
      publicAbsoluteUrl(
        request,
        homeForRole(session.role, session.communityId),
      ),
    );
  }

  const stagingBlocked = await isSessionBlockedByStaging(session);
  if (stagingBlocked) {
    const stagingPath = "/staging";
    const allowedWhileStaging = [stagingPath, "/login", "/register", "/signup"];
    const ok = allowedWhileStaging.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    if (!ok) {
      return NextResponse.redirect(publicAbsoluteUrl(request, stagingPath));
    }
  }

  const allowed = await canAccessPath(session, pathname);
  if (!allowed) {
    return NextResponse.redirect(
      forbiddenRedirect(session.role, publicRequestOrigin(request)),
    );
  }

  const response = NextResponse.next();
  if (tenant) applyDemoTenantCookies(response, tenant);
  return response;
}

export const config = {
  matcher: [
    "/go",
    "/go/",
    "/go/guide",
    "/go/guide/",
    "/go/superadmin",
    "/go/superadmin/",
    "/go/ironcrest",
    "/go/ironcrest/",
    "/go/goldenocala",
    "/go/goldenocala/",
    "/go/heritagebay",
    "/go/heritagebay/",
    "/go/huntersridge",
    "/go/huntersridge/",
    "/go/bonitabay",
    "/go/bonitabay/",
    "/go/shadowwood",
    "/go/shadowwood/",
    "/go/heroncreek",
    "/go/heroncreek/",
    "/go/debary",
    "/go/debary/",
    "/go/jacaranda",
    "/go/jacaranda/",
    "/go/thedunes",
    "/go/thedunes/",
    "/go/martindowns",
    "/go/martindowns/",
    "/go/thenest",
    "/go/thenest/",
    "/go/seagate",
    "/go/seagate/",
    "/go/copperleaf",
    "/go/copperleaf/",
    "/go/clubrenaissance",
    "/go/clubrenaissance/",
    "/go/fallsclub",
    "/go/fallsclub/",
    "/go/worthington",
    "/go/worthington/",
    "/go/estero",
    "/go/estero/",
    "/go/wildcatrun",
    "/go/wildcatrun/",
    "/go/highlandwoods",
    "/go/highlandwoods/",
    "/go/bonitanational",
    "/go/bonitanational/",
    "/go/windsor",
    "/go/windsor/",
    "/go/carrollwood",
    "/go/carrollwood/",
    "/go/spanishwells",
    "/go/spanishwells/",
    "/go/harborpointe",
    "/go/harborpointe/",
    "/go/willowcreek",
    "/go/willowcreek/",
    "/go/alliant",
    "/go/alliant/",
    "/go/oceansideresidents",
    "/go/oceansideresidents/",
    "/login",
    "/dashboard/:path*",
    "/communities/:path*",
    "/services-activities/:path*",
    "/amenities/:path*",
    "/tournaments/:path*",
    "/apparel/:path*",
    "/reports/:path*",
    "/notifications/:path*",
    "/templates/:path*",
    "/access-logs/:path*",
    "/roles/:path*",
    "/account/:path*",
    "/help-desk/:path*",
    "/invites/:path*",
    "/users/:path*",
    "/provider/:path*",
    "/member/:path*",
    "/board/:path*",
    "/pm/:path*",
    "/staging",
    "/api/:path*",
  ],
};
