import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import {
  generateRecoveryCodes,
  hashRecoveryCodes,
  verifyMfaSetupToken,
  verifyTotpCode,
} from "@/lib/server/mfa";
import { logEvent } from "@/lib/server/records";

/** Confirm TOTP enrollment with a code from the authenticator app. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { setupToken?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.setupToken || !body.code) {
    return NextResponse.json(
      { error: "Setup token and code are required" },
      { status: 400 },
    );
  }

  const setup = await verifyMfaSetupToken(body.setupToken);
  if (!setup || setup.userId !== session.sub) {
    return NextResponse.json(
      { error: "Setup expired. Start again." },
      { status: 400 },
    );
  }

  if (!verifyTotpCode(setup.secret, body.code)) {
    return NextResponse.json(
      { error: "Invalid authenticator code" },
      { status: 400 },
    );
  }

  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: session.sub },
    data: {
      mfaEnabled: true,
      mfaSecret: setup.secret,
      mfaRecoveryHashes: hashRecoveryCodes(recoveryCodes),
    },
  });

  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "MFA enabled",
    detail: "Authenticator app",
  });

  return NextResponse.json({
    ok: true,
    recoveryCodes,
  });
}
