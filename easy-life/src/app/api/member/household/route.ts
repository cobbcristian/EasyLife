import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  ensureDemoDependents,
  getHouseholdSnapshot,
  processDependentMembershipAging,
} from "@/lib/server/dependent-membership";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.communityId) {
    return NextResponse.json({ error: "No club on session" }, { status: 400 });
  }

  if (session.communityId === "golden-ocala") {
    await ensureDemoDependents(session.communityId);
  }
  await processDependentMembershipAging(session.communityId);
  const snapshot = await getHouseholdSnapshot(session.email);
  return NextResponse.json(snapshot);
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    dateOfBirth?: string;
    householdAddress?: string;
    dependentEmail?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = session.email.toLowerCase();
  const targetEmail = (body.dependentEmail ?? email).toLowerCase();

  if (targetEmail !== email) {
    const target = await prisma.memberProfileExt.findUnique({
      where: { userEmail: targetEmail },
    });
    if (!target || target.sponsorEmail?.toLowerCase() !== email) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
  }

  const data: {
    dateOfBirth?: string;
    householdAddress?: string;
  } = {};
  if (typeof body.dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth)) {
    data.dateOfBirth = body.dateOfBirth;
  }
  if (typeof body.householdAddress === "string") {
    data.householdAddress = body.householdAddress.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await prisma.memberProfileExt.upsert({
    where: { userEmail: targetEmail },
    create: {
      userEmail: targetEmail,
      ...data,
      householdRole: targetEmail === email ? "owner" : "dependent",
      sponsorEmail: targetEmail === email ? null : email,
    },
    update: data,
  });

  if (session.communityId) {
    await processDependentMembershipAging(session.communityId);
  }
  const snapshot = await getHouseholdSnapshot(email);
  return NextResponse.json(snapshot);
}
