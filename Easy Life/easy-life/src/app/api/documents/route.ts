import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { createDocument, ensureRecordsSeeded, listDocuments, logEvent } from "@/lib/server/records";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const audience = new URL(request.url).searchParams.get("audience") ?? undefined;
  await ensureRecordsSeeded();
  const docs = await listDocuments({
    communityId: session.communityId,
    audience: session.role === "member" ? "member" : audience,
  });
  const filtered =
    session.role === "member"
      ? docs.filter((d) => d.audience === "member")
      : docs;

  return NextResponse.json({
    documents: filtered.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      url:
        d.url === "#"
          ? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
          : d.url,
      size: d.sizeLabel,
      date: d.createdAt.toISOString(),
      uploadedBy: d.uploadedBy,
      audience: d.audience,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["admin", "board", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title?: string; category?: string; url?: string; audience?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.title || !body.category) {
    return NextResponse.json({ error: "Title and category required" }, { status: 400 });
  }

  const doc = await createDocument({
    communityId: session.communityId,
    title: body.title,
    category: body.category,
    url: body.url ?? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    audience: body.audience ?? (session.role === "board" ? "board" : "member"),
    uploadedBy: session.name,
  });
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Document uploaded",
    detail: body.title,
  });
  revalidatePath("/member/documents");
  revalidatePath("/board/documents");
  revalidatePath("/pm/documents");
  return NextResponse.json({ ok: true, document: doc });
}
