import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { verifyMemberIdDocument } from "@/lib/server/vehicle-verify";
import { validateDocumentUpload } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const uploadError = validateDocumentUpload(file);
  if (uploadError) {
    return NextResponse.json({ error: uploadError }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await verifyMemberIdDocument({
    memberName: session.name,
    memberEmail: session.email,
    fileName: file.name,
    buffer,
    mimeType: file.type,
  });

  return NextResponse.json({
    ok: true,
    verification: result,
  });
}
