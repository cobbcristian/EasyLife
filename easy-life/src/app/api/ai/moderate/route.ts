import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { moderateUpload } from "@/lib/server/ai/moderate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { fileName?: string; caption?: string; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await moderateUpload(body);
  return NextResponse.json(result);
}
