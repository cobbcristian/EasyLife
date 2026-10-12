import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import {
  SESSION_COOKIE,
  createSessionToken,
  homeForRole,
  sessionCookieOptions,
} from "@/lib/server/auth";
import { registerClubAdmin, registerMember } from "@/lib/server/db";
import { registerServiceProvider } from "@/lib/server/provider-enrollment";
import { communityRequiresEnrollmentApproval } from "@/lib/server/member-enrollment";
import {
  isPasswordStrongEnough,
  passwordPolicyMessages,
  passwordPolicyIssues,
} from "@/lib/password-policy";
import {
  emailPolicyIssues,
  emailPolicyMessage,
  isRealSignupEmail,
  normalizeSignupEmail,
} from "@/lib/email-policy";
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
    phone?: string;
    category?: string;
    bizType?: "food" | "service" | "activity" | string;
    address?: string;
    contactName?: string;
    featured?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name =
    body.name?.trim() ||
    `${body.firstName ?? ""} ${body.lastName ?? ""}`.trim();
  const email = body.email ? normalizeSignupEmail(body.email) : "";
  const { password } = body;
  const mode =
    body.mode ?? (body.role === "provider" ? "provider" : "setup");

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
    if (!body.communityId?.trim()) {
      return NextResponse.json(
        { error: "Select the community you want to serve" },
        { status: 400 },
      );
    }
    const bizType = body.bizType === "activity" ? "activity" : "service";
    result = await registerServiceProvider({
      email,
      password,
      businessName: name,
      communityId: body.communityId.trim(),
      phone: body.phone,
      category: body.category,
      type: bizType,
      contactName:
        body.contactName?.trim() ||
        `${body.firstName ?? ""} ${body.lastName ?? ""}`.trim() ||
        undefined,
      address: body.address,
      planId: body.plan ?? "starter",
      featured: body.featured !== false,
    });
  } else if (mode === "join") {
    if (!body.communityId) {
      return NextResponse.json({ error: "Select your community" }, { status: 400 });
    }
    const joinRole = body.role === "provider" ? "provider" : "member";
    if (joinRole === "provider") {
      result = await registerServiceProvider({
        email,
        password,
        businessName: name,
        communityId: body.communityId,
        phone: body.phone,
        category: body.category,
        type: body.bizType === "activity" ? "activity" : "service",
        contactName: body.contactName,
        address: body.address,
        planId: body.plan ?? "starter",
        featured: body.featured !== false,
      });
    } else {
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
    mode === "provider" || result.role === "provider"
      ? "/provider"
      : mode === "join" && result.role === "member"
        ? "/member/welcome"
        : homeForRole(result.role, result.communityId);
  const response = NextResponse.json({ ok: true, redirectTo });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
