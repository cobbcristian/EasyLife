import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import {
  SESSION_COOKIE,
  createSessionToken,
  homeForRole,
  sessionCookieOptions,
} from "@/lib/server/auth";
import { createUser, registerClubAdmin, registerMember } from "@/lib/server/db";
import { upsertProviderSubscription } from "@/lib/server/provider-subscriptions";
import { communityRequiresEnrollmentApproval } from "@/lib/server/member-enrollment";
import {
  isPasswordStrongEnough,
  passwordPolicyMessages,
  passwordPolicyIssues,
} from "@/lib/password-policy";
import type { AuthRole } from "@/lib/types";
import type { ProviderPlanId } from "@/lib/provider-plans";

export async function POST(request: Request) {
  if (!rateLimit(`register:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: {
    mode?: "setup" | "join" | "provider";
    email?: string;
    password?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    role?: AuthRole;
    communityId?: string;
    inviteCode?: string;
    unit?: string;
    communityName?: string;
    city?: string;
    state?: string;
    plan?: ProviderPlanId;
    directoryVisible?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name =
    body.name?.trim() ||
    `${body.firstName ?? ""} ${body.lastName ?? ""}`.trim();
  const { email, password } = body;
  const mode =
    body.mode ?? (body.role === "provider" ? "provider" : "setup");

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Name, email, and password are required" },
      { status: 400 },
    );
  }

  if (
    mode === "join" &&
    body.communityId &&
    communityRequiresEnrollmentApproval(body.communityId) &&
    !isPasswordStrongEnough(password)
  ) {
    const messages = passwordPolicyMessages(passwordPolicyIssues(password));
    return NextResponse.json(
      { error: messages.join(" ") || "Password does not meet requirements" },
      { status: 400 },
    );
  }

  let result;
  if (mode === "provider") {
    result = await createUser({
      email,
      password,
      name,
      role: "provider",
    });
    if (!("error" in result)) {
      await upsertProviderSubscription({
        userEmail: result.email,
        businessName: result.name,
        planId: body.plan ?? "starter",
        status: "pending",
      });
    }
  } else if (mode === "join") {
    if (!body.communityId) {
      return NextResponse.json({ error: "Select your community" }, { status: 400 });
    }
    const joinRole = body.role === "provider" ? "provider" : "member";
    result = await registerMember({
      email,
      password,
      name,
      communityId: body.communityId,
      inviteCode: body.inviteCode?.trim(),
      unit: body.unit?.trim(),
      role: joinRole,
      directoryVisible: body.directoryVisible,
    });
    if (!("error" in result) && joinRole === "provider") {
      await upsertProviderSubscription({
        userEmail: result.email,
        businessName: result.name,
        planId: body.plan ?? "starter",
        status: "pending",
      });
    }
  } else {
    if (!body.communityName || !body.city || !body.state) {
      return NextResponse.json(
        { error: "Community name, city, and state are required" },
        { status: 400 },
      );
    }
    result = await registerClubAdmin({
      email,
      password,
      name,
      communityName: body.communityName,
      city: body.city,
      state: body.state,
    });
  }

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  // HOA self-enroll: wait for staff approval — do not issue a session yet.
  if (result.status === "pending") {
    return NextResponse.json({
      ok: true,
      pending: true,
      redirectTo: "/register/pending",
    });
  }

  const token = await createSessionToken({
    sub: result.id,
    email: result.email,
    role: result.role,
    name: result.name,
    communityId: result.communityId,
  });

  const redirectTo =
    mode === "provider"
      ? "/provider/subscribe"
      : mode === "join" && result.role === "member"
        ? "/member/welcome"
        : homeForRole(result.role, result.communityId);
  const response = NextResponse.json({ ok: true, redirectTo });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
