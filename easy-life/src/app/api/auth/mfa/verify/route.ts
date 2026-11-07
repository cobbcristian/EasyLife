import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { logEvent } from "@/lib/server/records";
import {
  SESSION_COOKIE,
  createSessionToken,
  homeForRole,
  sessionCookieOptions,
} from "@/lib/server/auth";
import {
  consumeRecoveryCode,
  verifyMfaPendingToken,
  verifyTotpCode,
} from "@/lib/server/mfa";
import type { AuthRole } from "@/lib/types";

/**
 * Complete login after password step when MFA is enabled.
 * Body: { mfaToken, code, mobile?: boolean }
 */
export async function POST(request: Request) {
  if (!rateLimit(`mfa-verify:${clientIp(request)}`, 15, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: { mfaToken?: string; code?: string; mobile?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.mfaToken || !body.code) {
    return NextResponse.json(
      { error: "Verification token and code are required" },
      { status: 400 },
    );
  }

  const pending = await verifyMfaPendingToken(body.mfaToken);
  if (!pending) {
    return NextResponse.json(
      { error: "Session expired. Sign in again." },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: pending.sub } });
  if (!user?.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json(
      { error: "Two-factor authentication is not enabled" },
      { status: 400 },
    );
  }

  // Re-check account status at MFA completion. Login/OAuth already block
  // frozen/pending before issuing mfaToken, but an admin can freeze or
  // un-approve during the ~10m pending window — do not mint a fresh session.
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
  if (user.status !== "active") {
    return NextResponse.json(
      { error: "This account cannot sign in." },
      { status: 403 },
    );
  }

  let totpOk = verifyTotpCode(user.mfaSecret, body.code);
  let nextRecovery = user.mfaRecoveryHashes;
  if (!totpOk) {
    const used = consumeRecoveryCode(user.mfaRecoveryHashes, body.code);
    if (!used.ok) {
      return NextResponse.json(
        { error: "Invalid authenticator or recovery code" },
        { status: 401 },
      );
    }
    totpOk = true;
    nextRecovery = used.nextHashes;
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaRecoveryHashes: nextRecovery },
    });
  }

  if (!totpOk) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  // Prefer live user fields over the pending JWT so demotions/renames
  // applied during the MFA window are reflected in the new session.
  const role = user.role as AuthRole;
  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    role,
    name: user.name,
    communityId: user.communityId,
  });

  await logEvent({
    communityId: user.communityId,
    userName: user.name,
    action: body.mobile ? "Mobile login (MFA)" : "Login (MFA)",
    detail: role,
  });

  const redirectTo = homeForRole(role, user.communityId);

  if (body.mobile) {
    return NextResponse.json({
      ok: true,
      token,
      role,
      name: user.name,
      communityId: user.communityId,
      redirectTo,
    });
  }

  const response = NextResponse.json({ ok: true, role, redirectTo });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
