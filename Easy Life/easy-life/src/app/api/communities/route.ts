import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import { listCommunities, onboardCommunityWithAdmin } from "@/lib/server/db";
import { logEvent } from "@/lib/server/records";
import { isEmailConfigured, sendAdminWelcomeEmail } from "@/lib/server/notify";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const all = await listCommunities();
  const communities =
    isSuperAdmin(session) || !session.communityId
      ? all
      : all.filter((c) => c.id === session.communityId);
  return NextResponse.json({ communities });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    name?: string;
    city?: string;
    state?: string;
    adminName?: string;
    adminEmail?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.name || !body.city || !body.state || !body.adminName || !body.adminEmail) {
    return NextResponse.json(
      { error: "Community details and admin name/email are required" },
      { status: 400 },
    );
  }

  const result = await onboardCommunityWithAdmin({
    name: body.name,
    city: body.city,
    state: body.state,
    adminName: body.adminName,
    adminEmail: body.adminEmail,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  await logEvent({
    userName: session.name,
    action: "Community onboarded",
    detail: `${result.community.name} — admin ${result.admin.email}`,
  });

  let emailSent = false;
  let emailError: string | undefined;
  if (isEmailConfigured()) {
    const mail = await sendAdminWelcomeEmail({
      to: result.admin.email,
      adminName: result.admin.name,
      communityName: result.community.name,
      tempPassword: result.tempPassword,
      inviteCode: result.inviteCode,
    });
    emailSent = mail.ok;
    emailError = mail.error;
  }

  revalidatePath("/communities");
  return NextResponse.json({
    ok: true,
    community: result.community,
    adminEmail: result.admin.email,
    tempPassword: result.tempPassword,
    inviteCode: result.inviteCode,
    memberSignupUrl: "/signup",
    emailSent,
    emailError,
  });
}
