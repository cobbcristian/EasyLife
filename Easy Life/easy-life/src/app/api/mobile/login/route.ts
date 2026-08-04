import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/server/db";
import { verifyPassword } from "@/lib/server/password";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { logEvent } from "@/lib/server/records";
import { isCommunityStaging } from "@/lib/server/staging";
import {
  createSessionToken,
  homeForRole,
} from "@/lib/server/auth";
import { createMfaPendingToken } from "@/lib/server/mfa";

/** Oceanside white-label store apps only. */
const OCEANSIDE_COMMUNITY_ID = "oceanside-residents";

/**
 * Mobile JWT login for The Plaza at Oceanside native apps.
 * Returns a session token the WebView can exchange via /api/mobile/bridge
 * (httpOnly cookies cannot be set from injected JS reliably).
 */
export async function POST(request: Request) {
  if (!rateLimit(`mobile-login:${clientIp(request)}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: { email?: string; password?: string; communityId?: string };
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
      { error: "This account is frozen. Contact association management." },
      { status: 403 },
    );
  }

  if (user.status === "pending") {
    return NextResponse.json(
      {
        error:
          "Your registration is pending approval. You can sign in after management approves your account.",
        pending: true,
      },
      { status: 403 },
    );
  }

  const expectedCommunity =
    body.communityId?.trim() || OCEANSIDE_COMMUNITY_ID;
  if (user.communityId !== expectedCommunity) {
    return NextResponse.json(
      {
        error:
          "This app is for The Plaza at Oceanside residents only. Use the community web portal for other clubs.",
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
      { error: "This community is in staging mode. Access is not open yet." },
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
    action: "Mobile login",
    detail: `${user.role} · Plaza Oceanside app`,
  });

  return NextResponse.json({
    ok: true,
    token,
    role: user.role,
    name: user.name,
    communityId: user.communityId,
    redirectTo: homeForRole(user.role, user.communityId),
  });
}
