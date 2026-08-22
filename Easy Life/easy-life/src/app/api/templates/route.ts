import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import { createTemplate, ensureRecordsSeeded, listTemplates } from "@/lib/server/records";
import { parseBody, templateSchema } from "@/lib/server/validation";

export async function GET() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  return NextResponse.json({ templates: await listTemplates() });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = parseBody(templateSchema, body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const template = await createTemplate(parsed.data);
  revalidatePath("/templates");
  return NextResponse.json({ ok: true, template });
}
