import { NextResponse } from "next/server";
import { verifyPasswordResetToken } from "@/lib/server/auth";
import { updateUserPassword } from "@/lib/server/db";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { logEvent } from "@/lib/server/records";

export async function POST(request: Request) {
  if (!rateLimit(`reset:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { token, password } = body;
  if (!token || !password) {
    return NextResponse.json(
      { error: "Reset token and new password are required" },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const email = await verifyPasswordResetToken(token);
  if (!email) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  const ok = await updateUserPassword(email, password);
  if (!ok) {
    return NextResponse.json({ error: "Could not reset password" }, { status: 400 });
  }

  await logEvent({
    communityId: null,
    userName: email,
    action: "Password reset",
    detail: "Account password updated",
  });

  return NextResponse.json({ ok: true });
}
