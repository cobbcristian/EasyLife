import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/server/db";
import { createPasswordResetToken } from "@/lib/server/auth";
import { appPath } from "@/lib/server/app-url";
import { sendEmail } from "@/lib/server/notify";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

const PUBLIC_MESSAGE =
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
  if (!rateLimit(`forgot-email:${email}`, 5, 15 * 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  const user = await findUserByEmail(email);
  if (user) {
    const token = await createPasswordResetToken(user.email);
    const resetUrl = appPath(`/reset-password?token=${encodeURIComponent(token)}`);
    await sendEmail({
      to: user.email,
      subject: "Reset your Barnaby password",
      body: `Use this link to choose a new password. It expires soon.\n\n${resetUrl}\n\nIf you did not ask for this, ignore this email.`,
    });
  }

  return NextResponse.json({ ok: true, message: PUBLIC_MESSAGE });
}
