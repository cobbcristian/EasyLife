import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
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
  // Platform admin (no community) may list all; club staff only see their club.
  if (session.role === "admin" && !session.communityId) {
    const configs = await listNativeAppConfigs();
    return NextResponse.json({ configs });
  }
  const communityId = session.communityId;
  if (!communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  const configs = (await listNativeAppConfigs()).filter(
    (c) => c.communityId === communityId,
  );
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

  // Club admins may only mutate their own community; platform admin may set any.
  const communityId =
    session.communityId == null ? body.communityId : session.communityId;
  if (!communityId || !body.bundleId || !body.appName) {
    return NextResponse.json(
      { error: "communityId, bundleId, and appName required" },
      { status: 400 },
    );
  }
  if (session.communityId && body.communityId && body.communityId !== session.communityId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await upsertNativeAppConfig({
    ...body,
    communityId,
  });
  return NextResponse.json({ config });
}
