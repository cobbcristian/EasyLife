import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/server/db";
import {
  createPasswordResetChallenge,
  generatePasswordResetCode,
} from "@/lib/server/auth";
import { isEmailConfigured, sendEmail } from "@/lib/server/notify";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

const GENERIC_MESSAGE =
  "If an account exists for that email, password reset instructions have been sent.";

export async function POST(request: Request) {
  if (!rateLimit(`forgot:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  const code = generatePasswordResetCode();
  // Always mint a challenge so responses look identical for known/unknown emails.
  const challengeToken = await createPasswordResetChallenge(email, code);

  if (!user) {
    return NextResponse.json({
      ok: true,
      message: GENERIC_MESSAGE,
      challengeToken,
    });
  }

  const mailed = await sendEmail({
    to: user.email,
    subject: "Your password reset code",
    body: [
      "Use this code to reset your password:",
      "",
      `  ${code}`,
      "",
      "This code expires in 15 minutes. If you did not request a reset, you can ignore this email.",
    ].join("\n"),
  });

  // Production must deliver the OTP out-of-band. Never return the plaintext code
  // or a bearer password-reset JWT from this endpoint.
  if (process.env.NODE_ENV === "production") {
    if (!mailed.ok) {
      return NextResponse.json(
        {
          error:
            "Password reset email could not be sent. Contact association management.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({
      ok: true,
      message: GENERIC_MESSAGE,
      challengeToken,
    });
  }

  // Local/demo: when Resend is not configured, surface the OTP so the Figma
  // email-code screen still works. Never return a password-reset JWT here.
  return NextResponse.json({
    ok: true,
    message: GENERIC_MESSAGE,
    challengeToken,
    ...(isEmailConfigured() && mailed.ok
      ? {}
      : {
          code,
          emailDevHint:
            "Email is not configured — OTP returned for local development only.",
        }),
  });
}
