import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { canManageCommunity } from "@/lib/server/community-context";
import { createDocument, logEvent } from "@/lib/server/records";
import { parseDocumentImport } from "@/lib/server/member-import";

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

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rows = parseDocumentImport(body.text ?? "");
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows. Use: title, url, category (one per line)" },
      { status: 400 },
    );
  }

  let imported = 0;
  for (const row of rows) {
    await createDocument({
      communityId,
      title: row.title,
      url: row.url,
      category: row.category,
      uploadedBy: session.name,
    });
    imported++;
  }

  await logEvent({
    communityId,
    userName: session.name,
    action: "Document bulk import",
    detail: `${imported} documents imported`,
  });

  revalidatePath("/member/documents");
  return NextResponse.json({ ok: true, imported });
}
