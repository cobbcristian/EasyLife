import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { canManageCommunity } from "@/lib/server/community-context";
import { getCommunityById, updateCommunityBranding } from "@/lib/server/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!canManageCommunity(session, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    logoUrl?: string | null;
    primaryColor?: string | null;
    appDisplayName?: string | null;
    coverColor?: string;
    customDomain?: string | null;
    stagingMode?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const updated = await updateCommunityBranding(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  revalidatePath(`/communities/${id}`);
  revalidatePath("/communities");
  return NextResponse.json({ ok: true, community: updated });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const community = await getCommunityById(id);
  if (!community) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    community: {
      id: community.id,
      name: community.name,
      inviteCode: community.inviteCode,
      logoUrl: community.logoUrl,
      primaryColor: community.primaryColor,
      appDisplayName: community.appDisplayName,
      coverColor: community.coverColor,
    },
  });
}
