import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { privateFileHref, saveDocumentUpload, validateDocumentUpload } from "@/lib/server/storage";

const KINDS = new Set(["background_check", "government_id", "license", "insurance"]);

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.email.toLowerCase();
  const rows = await prisma.providerCredential.findMany({
    where: { providerEmail: email },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    credentials: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      fileName: row.fileName,
      url: privateFileHref(row.url) ?? row.url,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");
  if (!KINDS.has(kind) || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a document type and file" }, { status: 400 });
  }
  const err = validateDocumentUpload(file);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const email = session.email.toLowerCase();
  const communityId = session.communityId;
  if (!communityId) {
    return NextResponse.json({ error: "No community on this account" }, { status: 400 });
  }
  const provider = await prisma.provider.findFirst({
    where: {
      communityId,
      OR: [{ email }, ...(session.name ? [{ name: session.name }] : [])],
    },
  });
  if (!provider) {
    return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
  }
  const url = await saveDocumentUpload(file);
  const row = await prisma.providerCredential.create({
    data: {
      providerId: provider.id,
      communityId: provider.communityId,
      providerEmail: email,
      kind,
      fileName: file.name || kind,
      url,
    },
  });
  return NextResponse.json({
    ok: true,
    credential: {
      id: row.id,
      kind: row.kind,
      fileName: row.fileName,
      url: privateFileHref(row.url) ?? row.url,
      createdAt: row.createdAt.toISOString(),
    },
  });
}
