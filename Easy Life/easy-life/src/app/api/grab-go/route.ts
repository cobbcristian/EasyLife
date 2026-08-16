import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { communityHasGrabGo } from "@/lib/community-features";
import { ensureRecordsSeeded } from "@/lib/server/records";
import {
  createAppUnlockToken,
  ensureMemberNumber,
  getMemberRfidUid,
  linkMemberRfid,
  listGrabGoMachines,
  listMemberGrabGoSessions,
  openGrabGoSession,
  GrabGoError,
} from "@/lib/server/grab-go";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  if (!communityHasGrabGo(session.communityId)) {
    return NextResponse.json(
      { error: "Grab & Go is not available for this community.", machines: [] },
      { status: 404 },
    );
  }
  await ensureRecordsSeeded();
  const communityId = session.communityId;

  const [machines, visits, memberNumber, unlockToken, rfidUid] = await Promise.all([
    listGrabGoMachines(communityId),
    listMemberGrabGoSessions(session.email),
    ensureMemberNumber(session.email),
    Promise.resolve(createAppUnlockToken(session.email)),
    getMemberRfidUid(session.email),
  ]);

  return NextResponse.json({
    memberNumber,
    rfidUid,
    unlockToken,
    unlockExpiresInMinutes: 15,
    machines: machines.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      location: m.location,
      status: m.status,
      products: m.products.map((p) => ({
        sku: p.sku,
        name: p.name,
        price: p.price,
        category: p.category,
        stock: p.stock,
        shelfSlot: p.shelfSlot,
      })),
    })),
    visits: visits.map((v) => ({
      id: v.id,
      machineName: v.machine.name,
      location: v.machine.location,
      status: v.status,
      total: v.total,
      unlockMethod: v.unlockMethod,
      unlockedAt: v.unlockedAt.toISOString(),
      closedAt: v.closedAt?.toISOString() ?? null,
      items: JSON.parse(v.itemsJson) as unknown[],
    })),
  });
}

/** Remotely unlock a stand from the member app. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();

  let body: { machineCode?: string; action?: string; rfidUid?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "refresh_token") {
    return NextResponse.json({
      unlockToken: createAppUnlockToken(session.email),
      memberNumber: await ensureMemberNumber(session.email),
      rfidUid: await getMemberRfidUid(session.email),
      unlockExpiresInMinutes: 15,
    });
  }

  if (body.action === "link_rfid" || body.action === "issue_rfid") {
    try {
      const rfidUid = await linkMemberRfid({
        email: session.email,
        rfidUid: body.action === "issue_rfid" ? null : body.rfidUid,
      });
      return NextResponse.json({ ok: true, rfidUid });
    } catch (err) {
      if (err instanceof GrabGoError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  }

  if (!body.machineCode) {
    return NextResponse.json({ error: "machineCode required" }, { status: 400 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  try {
    const result = await openGrabGoSession({
      communityId: session.communityId,
      machineCode: body.machineCode,
      unlockMethod: "app_remote",
      unlockToken: createAppUnlockToken(session.email),
    });
    return NextResponse.json({
      ok: true,
      sessionId: result.session.id,
      machine: { code: result.machine.code, name: result.machine.name },
      resumed: result.resumed,
    });
  } catch (err) {
    if (err instanceof GrabGoError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
