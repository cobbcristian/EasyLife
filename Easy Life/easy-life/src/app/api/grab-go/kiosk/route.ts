import { NextResponse } from "next/server";
import { ensureRecordsSeeded } from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";
import {
  authorizeGrabGoMachine,
  closeGrabGoSession,
  declareAppItems,
  GrabGoError,
  listGrabGoMachines,
  openGrabGoSession,
  recordVisionGrab,
  recordVisionGrabFromNote,
  type UnlockMethod,
} from "@/lib/server/grab-go";

/**
 * Public-ish kiosk / edge device API for grab-and-go stands.
 * Requires x-grab-go-key when GRAB_GO_MACHINE_KEY is set; production always requires the key.
 */
function authorizeMachine(request: Request) {
  return authorizeGrabGoMachine(request);
}

export async function GET(request: Request) {
  const auth = authorizeMachine(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  await ensureRecordsSeeded();
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "Machine code required" }, { status: 400 });
  }
  const communityId = url.searchParams.get("communityId");

  let machine;
  if (communityId) {
    machine = (await listGrabGoMachines(communityId)).find((m) => m.code === code);
  } else {
    const row = await prisma.grabGoMachine.findUnique({
      where: { code },
      include: { products: { where: { active: true }, orderBy: { shelfSlot: "asc" } } },
    });
    if (row) {
      await listGrabGoMachines(row.communityId);
      machine = row;
    }
  }

  if (!machine) return NextResponse.json({ error: "Machine not found" }, { status: 404 });
  return NextResponse.json({
    machine: {
      code: machine.code,
      name: machine.name,
      location: machine.location,
      status: machine.status,
      cameraDeviceId: machine.cameraDeviceId,
      communityId: machine.communityId,
      products: machine.products,
    },
  });
}

export async function POST(request: Request) {
  const auth = authorizeMachine(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  await ensureRecordsSeeded();

  let body: {
    action?: "open" | "grab" | "return" | "declare" | "close" | "vision_note";
    communityId?: string;
    machineCode?: string;
    unlockMethod?: UnlockMethod;
    memberNumber?: string;
    memberEmail?: string;
    unlockToken?: string;
    cardLast4?: string;
    rfidUid?: string;
    sessionId?: string;
    sku?: string;
    quantity?: number;
    confidence?: number;
    cameraNote?: string;
    lines?: Array<{ sku: string; qty: number }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "open": {
        if (!body.machineCode || !body.unlockMethod) {
          return NextResponse.json(
            { error: "machineCode and unlockMethod required" },
            { status: 400 },
          );
        }
        const result = await openGrabGoSession({
          communityId: body.communityId,
          machineCode: body.machineCode,
          unlockMethod: body.unlockMethod,
          memberNumber: body.memberNumber,
          memberEmail: body.memberEmail,
          unlockToken: body.unlockToken,
          cardLast4: body.cardLast4,
          rfidUid: body.rfidUid,
        });
        return NextResponse.json({
          ok: true,
          sessionId: result.session.id,
          memberName: result.member.name,
          memberNumber: result.member.memberNumber,
          resumed: result.resumed,
          message: "Door unlocked. Cameras are watching — grab what you need and walk out.",
        });
      }
      case "grab":
      case "return": {
        if (!body.sessionId || !body.sku) {
          return NextResponse.json({ error: "sessionId and sku required" }, { status: 400 });
        }
        const result = await recordVisionGrab({
          sessionId: body.sessionId,
          sku: body.sku,
          quantity: body.quantity,
          confidence: body.confidence,
          kind: body.action === "return" ? "return" : "grab",
        });
        return NextResponse.json({ ok: true, items: result.items, total: result.session.total });
      }
      case "vision_note": {
        if (!body.sessionId || !body.cameraNote?.trim()) {
          return NextResponse.json(
            { error: "sessionId and cameraNote required" },
            { status: 400 },
          );
        }
        const vision = await recordVisionGrabFromNote({
          sessionId: body.sessionId,
          cameraNote: body.cameraNote,
          quantity: body.quantity,
        });
        return NextResponse.json({
          ok: true,
          items: vision.items,
          total: vision.session.total,
          matched: vision.items[vision.items.length - 1] ?? null,
        });
      }
      case "declare": {
        if (!body.sessionId || !body.lines?.length) {
          return NextResponse.json({ error: "sessionId and lines required" }, { status: 400 });
        }
        const session = await declareAppItems({
          sessionId: body.sessionId,
          lines: body.lines,
        });
        return NextResponse.json({ ok: true, sessionId: session?.id, total: session?.total });
      }
      case "close": {
        if (!body.sessionId) {
          return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }
        const result = await closeGrabGoSession(body.sessionId);
        return NextResponse.json({
          ok: true,
          total: result.session.total,
          chargeId: result.chargeId,
          items: JSON.parse(result.session.itemsJson),
          message:
            result.session.total > 0
              ? result.session.unlockMethod === "card_tap"
                ? "Walk-out complete. Card charged."
                : "Walk-out complete. Charged to your club account."
              : "Visit ended — nothing taken.",
        });
      }
      default: {
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
      }
    }
  } catch (err) {
    if (err instanceof GrabGoError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
