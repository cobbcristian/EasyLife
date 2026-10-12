import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, listRegistrations, updateRegistration } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "pm" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  return NextResponse.json({ registrations: await listRegistrations(session.communityId) });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "pm" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string; field?: string; value?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id || !body.field || body.value === undefined) {
    return NextResponse.json({ error: "ID, field, and value required" }, { status: 400 });
  }
  if (!["vehicle", "pet", "fingerprint"].includes(body.field)) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }
  await updateRegistration(
    body.id,
    body.field as "vehicle" | "pet" | "fingerprint",
    body.value,
  );
  revalidatePath("/pm/registrations");
  return NextResponse.json({ ok: true });
}
