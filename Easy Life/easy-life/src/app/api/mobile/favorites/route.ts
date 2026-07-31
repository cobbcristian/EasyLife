import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from "@/lib/server/member-api-store";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const all = await listFavorites(session.email);
  return NextResponse.json({
    favorites: all.filter((f) => !f.href.startsWith("block:") && !f.href.startsWith("report:")),
    blocked: all.filter((f) => f.href.startsWith("block:")),
    reports: all.filter((f) => f.href.startsWith("report:")),
  });
}

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { label?: string; href?: string; kind?: "save" | "block" | "report" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.label?.trim()) {
    return NextResponse.json({ error: "Label required" }, { status: 400 });
  }
  const kind = body.kind ?? "save";
  let href = body.href?.trim() || `saved:${body.label}`;
  switch (kind) {
    case "save":
      break;
    case "block":
      href = href.startsWith("block:") ? href : `block:${href}`;
      break;
    case "report":
      href = href.startsWith("report:") ? href : `report:${href}`;
      break;
    default: {
      const _exhaustive: never = kind;
      return NextResponse.json({ error: `Bad kind ${_exhaustive}` }, { status: 400 });
    }
  }
  const favorite = await addFavorite(session.email, {
    label: body.label.trim(),
    href,
  });
  return NextResponse.json({ ok: true, favorite });
}

export async function DELETE(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await removeFavorite(session.email, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
