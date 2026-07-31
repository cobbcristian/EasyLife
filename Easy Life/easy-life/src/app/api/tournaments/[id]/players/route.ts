import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  addTournamentPlayer,
  buildBracketFromPlayers,
  listTournamentPlayers,
  removeTournamentPlayer,
} from "@/lib/server/records";
import { parseBody, tournamentPlayerSchema } from "@/lib/server/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const players = await listTournamentPlayers(id);
  return NextResponse.json({ players });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = parseBody(tournamentPlayerSchema, body);
  if (!parsed.ok) {
    const actionBody = body as { action?: string };
    if (actionBody.action === "generate_bracket") {
      const updated = await buildBracketFromPlayers(id);
      if (!updated) {
        return NextResponse.json(
          { error: "Need at least 2 registered players" },
          { status: 400 },
        );
      }
      revalidatePath("/tournaments");
      revalidatePath("/member/tournaments");
      return NextResponse.json({ ok: true, tournament: updated });
    }
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const player = await addTournamentPlayer(id, parsed.data);
  revalidatePath("/tournaments");
  revalidatePath("/member/tournaments");
  return NextResponse.json({ ok: true, player });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await params;
  let body: { playerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.playerId) {
    return NextResponse.json({ error: "playerId required" }, { status: 400 });
  }
  const ok = await removeTournamentPlayer(body.playerId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidatePath("/tournaments");
  revalidatePath("/member/tournaments");
  return NextResponse.json({ ok: true });
}
