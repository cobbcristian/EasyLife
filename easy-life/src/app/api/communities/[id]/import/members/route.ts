import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { canManageCommunity } from "@/lib/server/community-context";
import { importCommunityMembers, parseMemberCsv } from "@/lib/server/member-import";
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

  let csv = "";
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (file instanceof File) {
      csv = await file.text();
    } else {
      csv = String(form.get("csv") ?? "");
    }
  } else {
    let body: { csv?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    csv = body.csv ?? "";
  }

  const rows = parseMemberCsv(csv);
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows. Use columns: name, email, unit, phone" },
      { status: 400 },
    );
  }

  const result = await importCommunityMembers(communityId, rows);
  await logEvent({
    communityId,
    userName: session.name,
    action: "Member bulk import",
    detail: `${result.created.length} created, ${result.skipped.length} skipped`,
  });
  revalidatePath("/communities");
  revalidatePath(`/communities/${communityId}`);
  return NextResponse.json({ ok: true, ...result });
}
