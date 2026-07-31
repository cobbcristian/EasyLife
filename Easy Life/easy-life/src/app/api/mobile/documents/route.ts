import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import { ensureRecordsSeeded, listDocuments } from "@/lib/server/records";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  const docs = await listDocuments({
    communityId: session.communityId,
    audience: "member",
  });
  return NextResponse.json({
    documents: docs
      .filter((d) => d.audience === "member" || d.audience === "all")
      .map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        url:
          d.url === "#"
            ? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
            : d.url,
        size: d.sizeLabel,
        date: d.createdAt.toISOString().slice(0, 10),
      })),
  });
}
