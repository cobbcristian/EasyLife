import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  ensureDemoRejoinCase,
  getMembershipSnapshot,
  listDeactivatedMembers,
  listWaitingRejoins,
  processRejoinReminders,
  reactivateMembership,
  requestRejoin,
  resignMembership,
  updateRejoinPolicy,
} from "@/lib/server/membership-rejoin";

export const dynamic = "force-dynamic";

function clubId(sessionCommunityId: string | null | undefined) {
  return sessionCommunityId?.trim() || null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const communityId = clubId(session.communityId);
  if (!communityId) {
    return NextResponse.json({ error: "No club on session" }, { status: 400 });
  }
  if (communityId === "golden-ocala") {
    await ensureDemoRejoinCase("golden-ocala");
    await processRejoinReminders("golden-ocala");
  }
  const snapshot = await getMembershipSnapshot(session.email, communityId);

  const staffRoles = ["admin", "pm", "board"];
  if (staffRoles.includes(session.role)) {
    const [waitlist, deactivated] = await Promise.all([
      listWaitingRejoins(communityId),
      listDeactivatedMembers(communityId),
    ]);
    return NextResponse.json({
      ...snapshot,
      waitlist: waitlist.waiting,
      deactivated,
      canEditPolicy: true,
    });
  }

  return NextResponse.json({ ...snapshot, canEditPolicy: false });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    action?: string;
    reason?: string;
    email?: string;
    membershipExpiresOn?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const communityId = clubId(session.communityId);
  if (!communityId) {
    return NextResponse.json({ error: "No club on session" }, { status: 400 });
  }

  if (body.action === "resign") {
    const result = await resignMembership({
      userEmail: session.email,
      communityId,
      reason: body.reason,
    });
    const snapshot = await getMembershipSnapshot(session.email, communityId);
    return NextResponse.json({ ...snapshot, resignResult: result });
  }

  if (body.action === "rejoin") {
    const result = await requestRejoin({
      userEmail: session.email,
      communityId,
    });
    const snapshot = await getMembershipSnapshot(session.email, communityId);
    return NextResponse.json({ ...snapshot, rejoinResult: result });
  }

  if (body.action === "reactivate") {
    if (!["admin", "pm", "board"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!body.email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }
    const result = await reactivateMembership({
      userEmail: body.email,
      communityId,
      membershipExpiresOn: body.membershipExpiresOn,
    });
    const snapshot = await getMembershipSnapshot(session.email, communityId);
    const [waitlist, deactivated] = await Promise.all([
      listWaitingRejoins(communityId),
      listDeactivatedMembers(communityId),
    ]);
    return NextResponse.json({
      ...snapshot,
      waitlist: waitlist.waiting,
      deactivated,
      canEditPolicy: true,
      reactivateResult: result,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "pm", "board"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    enabled?: boolean;
    waitDays?: number;
    memberRemindDaysBefore?: number;
    staffRemindDaysBefore?: number;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const communityId = clubId(session.communityId);
  if (!communityId) {
    return NextResponse.json({ error: "No club on session" }, { status: 400 });
  }
  await updateRejoinPolicy(communityId, body);
  const snapshot = await getMembershipSnapshot(session.email, communityId);
  const [waitlist, deactivated] = await Promise.all([
    listWaitingRejoins(communityId),
    listDeactivatedMembers(communityId),
  ]);
  return NextResponse.json({
    ...snapshot,
    waitlist: waitlist.waiting,
    deactivated,
    canEditPolicy: true,
  });
}
