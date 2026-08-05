import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/server/auth";
import { createUser, registerMember } from "@/lib/server/db";
import { upsertProviderSubscription } from "@/lib/server/provider-subscriptions";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import {
  emailPolicyIssues,
  emailPolicyMessage,
  isRealSignupEmail,
  normalizeSignupEmail,
} from "@/lib/email-policy";
import type { AuthRole } from "@/lib/types";
import type { ProviderPlanId } from "@/lib/provider-plans";

/** Bearer-token signup for the mobile app (no cookies). */
export async function POST(request: Request) {
  if (!rateLimit(`mregister:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  let body: {
    mode?: "join" | "provider";
    email?: string;
    password?: string;
    name?: string;
    phone?: string;
    role?: AuthRole;
    communityId?: string;
    inviteCode?: string;
    unit?: string;
    plan?: ProviderPlanId;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email ? normalizeSignupEmail(body.email) : "";
  const { password } = body;
  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Name, email, and password are required" },
      { status: 400 },
    );
  }
  if (!isRealSignupEmail(email)) {
    return NextResponse.json(
      { error: emailPolicyMessage(emailPolicyIssues(email)) },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const mode = body.mode ?? "join";
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
  } else {
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
    });
    if (!("error" in result) && joinRole === "provider") {
      await upsertProviderSubscription({
        userEmail: result.email,
        businessName: result.name,
        planId: body.plan ?? "starter",
        status: "pending",
      });
    }
  }

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  if (result.status === "pending") {
    return NextResponse.json({
      ok: true,
      pending: true,
      message:
        "Registration received. You can sign in after association management approves your account.",
    });
  }

  const token = await createSessionToken({
    sub: result.id,
    email: result.email,
    role: result.role,
    name: result.name,
    communityId: result.communityId,
  });

  return NextResponse.json({
    token,
    user: {
      name: result.name,
      email: result.email,
      role: result.role,
      phone: body.phone ?? null,
    },
  });
}
