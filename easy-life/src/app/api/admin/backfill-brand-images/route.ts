import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { backfillBrandImages } from "@/lib/server/db";

/** Admin-only: force-sync community logos and provider images from Figma mappings. */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await backfillBrandImages();
  return NextResponse.json({ ok: true, ...result });
}
