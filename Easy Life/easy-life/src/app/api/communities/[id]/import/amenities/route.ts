import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { canManageCommunity } from "@/lib/server/community-context";
import { importCommunityAmenities, parseAmenityCsv } from "@/lib/server/member-import";
import { logEvent } from "@/lib/server/records";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: communityId } = await params;
  if (!canManageCommunity(session, communityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { csv?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rows = parseAmenityCsv(body.csv ?? "");
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows. Use: name, kind, fee, schedule, units, surface" },
      { status: 400 },
    );
  }

  const result = await importCommunityAmenities(communityId, rows);
  await logEvent({
    communityId,
    userName: session.name,
    action: "Amenity bulk import",
    detail: `${result.imported} amenities imported`,
  });

  revalidatePath("/amenities");
  return NextResponse.json({ ok: true, ...result });
}
