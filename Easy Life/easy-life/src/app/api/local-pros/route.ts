import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { listLocalPros } from "@/lib/server/local-pros";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pros = await listLocalPros(session.communityId ?? null);
  return NextResponse.json({ pros });
}
