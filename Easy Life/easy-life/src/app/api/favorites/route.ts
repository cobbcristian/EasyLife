import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from "@/lib/server/member-api-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ favorites: await listFavorites(session.email) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { label?: string; href?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.label || !body.href) {
    return NextResponse.json({ error: "Label and href required" }, { status: 400 });
  }

  const favorite = await addFavorite(session.email, { label: body.label, href: body.href });
  return NextResponse.json({ ok: true, favorite });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  if (!(await removeFavorite(session.email, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
