import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import {
  listNativeAppConfigs,
  upsertNativeAppConfig,
  ensureKnownNativeApps,
} from "@/lib/server/native-apps";

export async function GET() {
  const session = await getSession();
  if (!session || !["admin", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureKnownNativeApps();
  const configs = await listNativeAppConfigs();
  return NextResponse.json({ configs });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    communityId: string;
    bundleId: string;
    appName: string;
    primaryColor?: string;
    logoUrl?: string;
    platform?: string;
    enabled?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Club admins may only write their own club; platform super-admin may write any.
  const communityId = isSuperAdmin(session)
    ? body.communityId
    : session.communityId;
  if (!communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  if (!isSuperAdmin(session) && body.communityId && body.communityId !== communityId) {
    return NextResponse.json({ error: "Cannot modify another club" }, { status: 403 });
  }

  const config = await upsertNativeAppConfig({
    ...body,
    communityId,
  });
  return NextResponse.json({ config });
}
