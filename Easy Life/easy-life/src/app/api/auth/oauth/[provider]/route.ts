import { NextResponse } from "next/server";
import {
  buildOAuthAuthorizeUrl,
  createOAuthState,
  isOAuthProvider,
  listConfiguredOAuthProviders,
  oauthCookieNames,
} from "@/lib/server/oauth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: raw } = await context.params;
  if (!isOAuthProvider(raw)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  if (!listConfiguredOAuthProviders().includes(raw)) {
    return NextResponse.json(
      {
        error: `${raw} SSO is not configured. Add the provider client id/secret env vars.`,
      },
      { status: 503 },
    );
  }

  const state = createOAuthState();
  const url = await buildOAuthAuthorizeUrl(raw, state);
  const response = NextResponse.redirect(url);
  const cookies = oauthCookieNames();
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(cookies.state, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure,
  });
  response.cookies.set(cookies.provider, raw, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure,
  });
  return response;
}
