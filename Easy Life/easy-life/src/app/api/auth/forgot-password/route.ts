import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/server/db";
import { createPasswordResetToken } from "@/lib/server/auth";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

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

  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({
      ok: true,
      message:
        "If an account exists for that email, password reset instructions have been sent.",
    });
  }

  const token = await createPasswordResetToken(user.email);
  const origin = new URL(request.url).origin;
  const resetPath = `/reset-password?token=${encodeURIComponent(token)}`;
  // Demo 5-digit OTP for MVP Email Code screen (4616:17523).
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
  }
  const code = String(10000 + (hash % 90000));

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, password reset instructions have been sent.",
    resetUrl: `${origin}${resetPath}`,
    resetPath,
    token,
    code,
  });
}
