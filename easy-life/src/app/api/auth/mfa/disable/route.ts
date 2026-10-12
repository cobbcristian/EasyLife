import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { verifyPassword } from "@/lib/server/password";
import {
  consumeRecoveryCode,
  verifyTotpCode,
} from "@/lib/server/mfa";
import { logEvent } from "@/lib/server/records";

/** Disable MFA — requires current TOTP or recovery code + password. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { password?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.password || !body.code) {
    return NextResponse.json(
      { error: "Password and authenticator (or recovery) code are required" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user?.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json(
      { error: "Two-factor authentication is not enabled" },
      { status: 400 },
    );
  }

  if (!verifyPassword(body.password, user.password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const totpOk = verifyTotpCode(user.mfaSecret, body.code);
  let recoveryHashes = user.mfaRecoveryHashes;
  if (!totpOk) {
    const used = consumeRecoveryCode(user.mfaRecoveryHashes, body.code);
    if (!used.ok) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
    recoveryHashes = used.nextHashes;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      mfaRecoveryHashes: recoveryHashes,
    },
  });

  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "MFA disabled",
    detail: "Authenticator app",
  });

  return NextResponse.json({ ok: true });
}
