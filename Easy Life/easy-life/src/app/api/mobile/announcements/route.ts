import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/server/auth";
import { ensureRecordsSeeded, listAnnouncements } from "@/lib/server/records";

function bearer(request: Request): string | undefined {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export async function GET(request: Request) {
  const session = await verifySessionToken(bearer(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  await ensureRecordsSeeded();
  const rows = await listAnnouncements(session.communityId);
  return NextResponse.json({
    announcements: rows.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      author: a.author,
      priority: a.priority,
      date: a.createdAt.toISOString().slice(0, 10),
    })),
  });
}
