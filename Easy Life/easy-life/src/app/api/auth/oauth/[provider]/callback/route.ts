import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/server/db";
import {
  SESSION_COOKIE,
  createSessionToken,
  homeForRole,
  sessionCookieOptions,
} from "@/lib/server/auth";
import { createMfaPendingToken } from "@/lib/server/mfa";
import { logEvent } from "@/lib/server/records";
import {
  fetchOAuthProfile,
  isOAuthProvider,
  listConfiguredOAuthProviders,
  oauthCookieNames,
  type OAuthProvider,
} from "@/lib/server/oauth";
import { appPath } from "@/lib/server/app-url";
import {
  ACTIVE_COMMUNITY_COOKIE,
  DEMO_TENANT_COOKIE,
  resolveDemoTenantFromCookieHeader,
} from "@/lib/tenant";

async function resolveAppleName(form: FormData): Promise<string | undefined> {
  const raw = form.get("user");
  if (typeof raw !== "string" || !raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as {
      name?: { firstName?: string; lastName?: string };
    };
    const first = parsed.name?.firstName?.trim() ?? "";
    const last = parsed.name?.lastName?.trim() ?? "";
    const full = `${first} ${last}`.trim();
    return full || undefined;
  } catch {
    return undefined;
  }
}

function readCookie(cookieHeader: string, name: string): string | undefined {
  return cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

function loginErrorRedirect(message: string) {
  return NextResponse.redirect(
    appPath(`/login?error=${encodeURIComponent(message)}`),
  );
}

async function completeOAuthLogin(opts: {
  provider: OAuthProvider;
  code: string;
  request: Request;
  appleUserName?: string;
}) {
  const profile = await fetchOAuthProfile(
    opts.provider,
    opts.code,
    opts.appleUserName,
  );

  const user = await findUserByEmail(profile.email);
  if (!user) {
    // Import/register first — don't invent incomplete HOA accounts via SSO.
    const registerUrl = new URL(appPath("/register"));
    registerUrl.searchParams.set("email", profile.email);
    registerUrl.searchParams.set("name", profile.name);
    registerUrl.searchParams.set("sso", opts.provider);
    return NextResponse.redirect(registerUrl.toString());
  }

  if (user.status === "frozen") {
    return loginErrorRedirect("This account is frozen.");
  }
  if (user.status === "pending") {
    return NextResponse.redirect(appPath("/register/pending"));
  }

  if (user.mfaEnabled) {
    const mfaToken = await createMfaPendingToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      communityId: user.communityId,
    });
    return NextResponse.redirect(
      appPath(`/login?mfaToken=${encodeURIComponent(mfaToken)}`),
    );
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
    action: "SSO login",
    detail: `${opts.provider} · ${user.role}`,
  });

  const redirectTo = homeForRole(user.role, user.communityId);
  const response = NextResponse.redirect(appPath(redirectTo));
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);

  const cookieNames = oauthCookieNames();
  response.cookies.delete(cookieNames.state);
  response.cookies.delete(cookieNames.provider);

  const tenant = resolveDemoTenantFromCookieHeader(
    opts.request.headers.get("host"),
    opts.request.headers.get("cookie"),
  );
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

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: raw } = await context.params;
  if (!isOAuthProvider(raw) || !listConfiguredOAuthProviders().includes(raw)) {
    return loginErrorRedirect("SSO provider unavailable");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  if (err) return loginErrorRedirect(err);

  const expectedState = readCookie(
    request.headers.get("cookie") ?? "",
    oauthCookieNames().state,
  );
  if (!code || !state || !expectedState || state !== expectedState) {
    return loginErrorRedirect("SSO state mismatch. Try again.");
  }

  try {
    return await completeOAuthLogin({ provider: raw, code, request });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SSO failed";
    return loginErrorRedirect(msg);
  }
}

/** Apple uses form_post. */
export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: raw } = await context.params;
  if (raw !== "apple") {
    return loginErrorRedirect("Invalid SSO callback");
  }
  if (!listConfiguredOAuthProviders().includes("apple")) {
    return loginErrorRedirect("Apple SSO is not configured");
  }

  const form = await request.formData();
  const code = String(form.get("code") ?? "");
  const state = String(form.get("state") ?? "");
  const appleName = await resolveAppleName(form);
  const expectedState = readCookie(
    request.headers.get("cookie") ?? "",
    oauthCookieNames().state,
  );
  if (!code || !state || !expectedState || state !== expectedState) {
    return loginErrorRedirect("SSO state mismatch. Try again.");
  }

  try {
    return await completeOAuthLogin({
      provider: "apple",
      code,
      request,
      appleUserName: appleName,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SSO failed";
    return loginErrorRedirect(msg);
  }
}
