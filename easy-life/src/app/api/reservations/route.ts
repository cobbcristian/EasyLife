import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  createReservation,
  listReservationsForMember,
  logEvent,
} from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reservations = await listReservationsForMember(session.email);
  return NextResponse.json({ reservations });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { restaurant?: string; date?: string; time?: string; partySize?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.restaurant || !body.date || !body.time) {
    return NextResponse.json({ error: "Restaurant, date, and time required" }, { status: 400 });
  }

  const reservation = await createReservation({
    communityId: session.communityId,
    memberEmail: session.email,
    memberName: session.name,
    restaurant: body.restaurant,
    date: body.date,
    time: body.time,
    partySize: body.partySize ?? 2,
  });
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Table reservation",
    detail: `${body.restaurant} · ${body.date} ${body.time}`,
  });
  revalidatePath("/member/dining");
  return NextResponse.json({ ok: true, reservation });
}
