import { NextResponse } from "next/server";
import {
  createPasswordResetToken,
  verifyPasswordResetChallenge,
} from "@/lib/server/auth";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

/**
 * Exchange a reset challenge + emailed OTP for a short-lived password-reset JWT.
 * The challenge alone is not enough — the OTP must match the hash inside it.
 */
export async function POST(request: Request) {
  if (!rateLimit(`verify-reset:${clientIp(request)}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: { challengeToken?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const challengeToken = body.challengeToken?.trim();
  const code = body.code?.replace(/\D/g, "").slice(0, 5) ?? "";
  if (!challengeToken || code.length < 5) {
    return NextResponse.json(
      { error: "Verification code is required" },
      { status: 400 },
    );
  }

  const email = await verifyPasswordResetChallenge(challengeToken, code);
  if (!email) {
    return NextResponse.json(
      { error: "The code entered does not match the one sent to your email." },
      { status: 400 },
    );
  }

  const token = await createPasswordResetToken(email);
  return NextResponse.json({ ok: true, token });
}
