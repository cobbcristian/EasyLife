import { NextResponse } from "next/server";
import { createHash } from "crypto";
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
  let body: { challengeToken?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const challengeToken = body.challengeToken?.trim();
  const code = body.code?.replace(/\D/g, "").slice(0, 6) ?? "";
  if (!challengeToken || code.length < 6) {
    return NextResponse.json(
      { error: "Verification code is required" },
      { status: 400 },
    );
  }

  // Bound attempts per challenge (not only per IP) so X-Forwarded-For spoofing
  // cannot reset the window for the same token on a single instance.
  const challengeKey = createHash("sha256")
    .update(challengeToken)
    .digest("hex")
    .slice(0, 24);
  if (
    !rateLimit(`verify-reset:chal:${challengeKey}`, 8, 15 * 60_000) ||
    !rateLimit(`verify-reset:ip:${clientIp(request)}`, 20, 60_000)
  ) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
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
