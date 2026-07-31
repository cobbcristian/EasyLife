import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/server/db";
import { verifyPassword } from "@/lib/server/password";
import { createSessionToken } from "@/lib/server/auth";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { isCommunityStaging } from "@/lib/server/staging";
import { prisma } from "@/lib/server/prisma";
import {
  MEMBERSHIP_NOT_RENEWED_MESSAGE,
  isMembershipDeactivated,
} from "@/lib/membership-status";

// Token-based login for the mobile app (no cookies — returns a bearer JWT).
export async function POST(request: Request) {
  if (!rateLimit(`mlogin:${clientIp(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  if (user.status === "frozen") {
    return NextResponse.json(
      { error: "This account is frozen. Contact your club administrator." },
      { status: 403 },
    );
  }
  if (user.role === "member") {
    const profile = await prisma.memberProfileExt.findUnique({
      where: { userEmail: user.email.toLowerCase() },
      select: { membershipStatus: true },
    });
    if (isMembershipDeactivated(profile?.membershipStatus)) {
      return NextResponse.json(
        { error: MEMBERSHIP_NOT_RENEWED_MESSAGE },
        { status: 403 },
      );
    }
  }
  if (
    user.role !== "admin" &&
    user.communityId &&
    (await isCommunityStaging(user.communityId))
  ) {
    return NextResponse.json(
      { error: "This club is in staging mode. Member access is not open yet." },
      { status: 403 },
    );
  }
  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    communityId: user.communityId,
  });
  return NextResponse.json({
    token,
    user: { name: user.name, email: user.email, role: user.role },
  });
}
