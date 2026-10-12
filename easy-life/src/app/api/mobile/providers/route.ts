import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import { listAllProviders } from "@/lib/server/db";
import { ensureRecordsSeeded } from "@/lib/server/records";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  const all = await listAllProviders();
  const providers = all.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    type: p.type,
    rating: p.rating ?? 4.5,
    description: "",
    community: p.community,
  }));
  return NextResponse.json({ providers });
}
