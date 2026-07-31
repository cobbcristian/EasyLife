import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { createPet, listPets } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ pets: await listPets(session.sub) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { name?: string; type?: string; breed?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.name || !body.type) {
    return NextResponse.json({ error: "Name and type required" }, { status: 400 });
  }
  const pet = await createPet({
    userId: session.sub,
    name: body.name,
    type: body.type,
    breed: body.breed ?? "",
  });
  revalidatePath("/member/profile");
  return NextResponse.json({ ok: true, pet });
}
