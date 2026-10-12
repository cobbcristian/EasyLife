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

  const role = pending.role as AuthRole;
  const token = await createSessionToken({
    sub: pending.sub,
    email: pending.email,
    role,
    name: pending.name,
    communityId: pending.communityId,
  });

  await logEvent({
    communityId: pending.communityId,
    userName: pending.name,
    action: body.mobile ? "Mobile login (MFA)" : "Login (MFA)",
    detail: role,
  });

  const redirectTo = homeForRole(role, pending.communityId);

  if (body.mobile) {
    return NextResponse.json({
      ok: true,
      token,
      role,
      name: pending.name,
      communityId: pending.communityId,
      redirectTo,
    });
  }

  const response = NextResponse.json({ ok: true, role, redirectTo });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
