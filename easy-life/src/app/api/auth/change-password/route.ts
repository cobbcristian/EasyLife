import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { findUserByEmail, updateUserPassword } from "@/lib/server/db";
import { verifyPassword } from "@/lib/server/password";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { logEvent } from "@/lib/server/records";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`change-password:${clientIp(request)}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required" },
      { status: 400 },
    );
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const user = await findUserByEmail(session.email);
  if (!user || !verifyPassword(currentPassword, user.password)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const ok = await updateUserPassword(session.email, newPassword);
  if (!ok) {
    return NextResponse.json({ error: "Could not update password" }, { status: 400 });
  }

  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Password changed",
    detail: "Account password updated from settings",
  });

  return NextResponse.json({ ok: true });
}
