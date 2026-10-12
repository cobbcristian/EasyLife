import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import {
  buildOtpAuthUrl,
  generateMfaSecret,
  createMfaSetupToken,
  otpAuthQrDataUrl,
} from "@/lib/server/mfa";

/** Start authenticator enrollment (logged-in user). */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.mfaEnabled) {
    return NextResponse.json(
      { error: "Two-factor authentication is already enabled" },
      { status: 400 },
    );
  }

  const secret = generateMfaSecret();
  const issuer =
    user.communityId === "oceanside-residents"
      ? "The Plaza at Oceanside"
      : "Easy Life";
  const otpauthUrl = buildOtpAuthUrl({
    email: user.email,
    secret,
    issuer,
  });
  const qrDataUrl = await otpAuthQrDataUrl(otpauthUrl);
  const setupToken = await createMfaSetupToken(user.id, secret);

  return NextResponse.json({
    setupToken,
    secret,
    otpauthUrl,
    qrDataUrl,
  });
}
