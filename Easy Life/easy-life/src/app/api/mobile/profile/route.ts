import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import { getAccountProfile } from "@/lib/server/db";
import {
  getMemberProfile,
  updateMemberProfile,
} from "@/lib/server/member-api-store";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [profile, account] = await Promise.all([
    getMemberProfile(session.email),
    getAccountProfile(session.email),
  ]);
  return NextResponse.json({
    ...profile,
    name: session.name ?? profile.name,
    email: session.email,
    role: session.role,
    avatarUrl: account?.avatarUrl ?? null,
  });
}

export async function PATCH(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    name?: string;
    phone?: string;
    unit?: string;
    directoryVisible?: boolean;
    commsPush?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const profile = await updateMemberProfile(session.email, body);
  const account = await getAccountProfile(session.email);
  return NextResponse.json({
    ...profile,
    name: body.name ?? session.name ?? profile.name,
    email: session.email,
    role: session.role,
    avatarUrl: account?.avatarUrl ?? null,
  });
}
