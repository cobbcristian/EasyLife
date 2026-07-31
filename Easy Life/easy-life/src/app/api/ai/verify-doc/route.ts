import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { verifyMemberIdDocument } from "@/lib/server/vehicle-verify";
import { saveDocumentUpload } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let url: string | null = null;
  try {
    url = await saveDocumentUpload(file);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 },
    );
  }

  const result = await verifyMemberIdDocument({
    memberName: session.name,
    memberEmail: session.email,
    fileName: file.name,
    buffer,
    mimeType: file.type,
  });

  return NextResponse.json({
    ok: true,
    url,
    verification: result,
  });
}
