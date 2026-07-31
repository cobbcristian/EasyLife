import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/server/prisma";
import { recordFbSpend } from "@/lib/server/membership";
import { matchProductHeuristic } from "@/lib/server/ai/grab-go-vision";
import { isOpenAiConfigured, openAiMatchProduct } from "@/lib/server/ai/openai";

export type UnlockMethod =
  | "member_id"
  | "app_qr"
  | "card_tap"
  | "app_remote"
  | "rfid";

export class GrabGoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GrabGoError";
  }
}

export interface GrabGoLine {
  sku: string;
  name: string;
  qty: number;
  price: number;
  confidence: number;
}

function parseItems(raw: string): GrabGoLine[] {
  try {
    return JSON.parse(raw) as GrabGoLine[];
  } catch {
    return [];
  }
}

export function memberNumberFromEmail(email: string): string {
  const hash = createHash("sha256").update(email.toLowerCase()).digest("hex");
  const n = parseInt(hash.slice(0, 8), 16) % 900000;
  return String(100000 + n);
}

/** Stable demo RFID UID derived from email (keyboard-wedge readers type hex). */
export function rfidUidFromEmail(email: string): string {
  const hash = createHash("sha256")
    .update(`rfid:${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
  return `CL-${hash}`;
}

export async function ensureMemberNumber(email: string): Promise<string> {
  const key = email.toLowerCase();
  const existing = await prisma.memberProfileExt.findUnique({
    where: { userEmail: key },
    select: { memberNumber: true },
  });
  if (existing?.memberNumber) return existing.memberNumber;
  const memberNumber = memberNumberFromEmail(key);
  await prisma.memberProfileExt.upsert({
    where: { userEmail: key },
    create: { userEmail: key, memberNumber },
    update: { memberNumber },
  });
  return memberNumber;
}

export async function getMemberRfidUid(email: string): Promise<string | null> {
  const row = await prisma.memberProfileExt.findUnique({
    where: { userEmail: email.toLowerCase() },
    select: { rfidUid: true },
  });
  return row?.rfidUid ?? null;
}

/** Issue or replace the member's RFID fob / wristband UID. */
export async function linkMemberRfid(input: {
  email: string;
  rfidUid?: string | null;
}): Promise<string> {
  const key = input.email.toLowerCase();
  await ensureMemberNumber(key);
  const rfidUid = (input.rfidUid?.trim() || rfidUidFromEmail(key)).toUpperCase();

  const clash = await prisma.memberProfileExt.findFirst({
    where: { rfidUid, NOT: { userEmail: key } },
    select: { userEmail: true },
  });
  if (clash) {
    throw new GrabGoError("That RFID tag is already linked to another member.");
  }

  await prisma.memberProfileExt.upsert({
    where: { userEmail: key },
    create: {
      userEmail: key,
      memberNumber: memberNumberFromEmail(key),
      rfidUid,
    },
    update: { rfidUid },
  });
  return rfidUid;
}

export async function ensureGrabGoSeeded(communityId: string) {
  const count = await prisma.grabGoMachine.count({ where: { communityId } });
  if (count > 0) return;

  const prefix =
    communityId === "iron-lake"
      ? "GG-IL"
      : communityId === "golden-ocala"
        ? "GG"
        : `GG-${communityId.slice(0, 8).toUpperCase()}`;

  const machine = await prisma.grabGoMachine.create({
    data: {
      communityId,
      code: `${prefix}-POOL-01`,
      name: "Poolside Grab & Go",
      location: "Pool deck — north wall",
      status: "online",
      cameraDeviceId: `${prefix.toLowerCase()}-cam-pool-01`,
      products: {
        create: [
          { sku: "WATER-500", name: "Sparkling Water", price: 3.5, category: "drinks", shelfSlot: "A1", stock: 24 },
          { sku: "GATOR-20", name: "Gatorade", price: 4.0, category: "drinks", shelfSlot: "A2", stock: 18 },
          { sku: "CHIP-SEA", name: "Sea Salt Chips", price: 3.25, category: "snacks", shelfSlot: "B1", stock: 20 },
          { sku: "PROT-BAR", name: "Protein Bar", price: 4.5, category: "snacks", shelfSlot: "B2", stock: 16 },
          { sku: "FRUIT-CUP", name: "Fresh Fruit Cup", price: 5.5, category: "fresh", shelfSlot: "C1", stock: 12 },
          { sku: "YOGURT", name: "Greek Yogurt", price: 3.75, category: "fresh", shelfSlot: "C2", stock: 14 },
          { sku: "CHOC-BAR", name: "Dark Chocolate", price: 2.75, category: "snacks", shelfSlot: "B3", stock: 22 },
          { sku: "SODA-CAN", name: "Club Soda Can", price: 3.0, category: "drinks", shelfSlot: "A3", stock: 20 },
        ],
      },
    },
  });

  await prisma.grabGoMachine.create({
    data: {
      communityId,
      code: `${prefix}-TENNIS-01`,
      name: "Tennis Court Grab & Go",
      location: "Tennis pavilion",
      status: "online",
      cameraDeviceId: `${prefix.toLowerCase()}-cam-tennis-01`,
      products: {
        create: [
          { sku: "WATER-500", name: "Still Water", price: 3.0, category: "drinks", shelfSlot: "A1", stock: 30 },
          { sku: "ELECTRO", name: "Electrolyte Pack", price: 2.5, category: "drinks", shelfSlot: "A2", stock: 25 },
          { sku: "TRAIL-MIX", name: "Trail Mix", price: 4.25, category: "snacks", shelfSlot: "B1", stock: 15 },
          { sku: "BANANA", name: "Banana", price: 1.5, category: "fresh", shelfSlot: "C1", stock: 20 },
          { sku: "PROT-BAR", name: "Protein Bar", price: 4.5, category: "snacks", shelfSlot: "B2", stock: 18 },
        ],
      },
    },
  });

  return machine;
}

export async function listGrabGoMachines(communityId: string) {
  await ensureGrabGoSeeded(communityId);
  return prisma.grabGoMachine.findMany({
    where: { communityId },
    include: { products: { where: { active: true }, orderBy: { shelfSlot: "asc" } } },
    orderBy: { name: "asc" },
  });
}

async function resolveMember(input: {
  memberEmail?: string;
  memberNumber?: string;
  rfidUid?: string;
}): Promise<{ email: string; name: string; memberNumber: string }> {
  if (input.rfidUid) {
    const uid = input.rfidUid.trim().toUpperCase();
    const profile = await prisma.memberProfileExt.findFirst({
      where: { rfidUid: uid },
    });
    if (!profile) {
      throw new GrabGoError("RFID tag not recognized. Link it in Grab & Go → Your RFID.");
    }
    const user = await prisma.user.findUnique({ where: { email: profile.userEmail } });
    const memberNumber =
      profile.memberNumber ?? (await ensureMemberNumber(profile.userEmail));
    return {
      email: profile.userEmail,
      name: user?.name ?? profile.userEmail.split("@")[0],
      memberNumber,
    };
  }
  if (input.memberEmail) {
    const email = input.memberEmail.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    const memberNumber = await ensureMemberNumber(email);
    return {
      email,
      name: user?.name ?? email.split("@")[0],
      memberNumber,
    };
  }
  if (input.memberNumber) {
    const profile = await prisma.memberProfileExt.findFirst({
      where: { memberNumber: input.memberNumber.trim() },
    });
    if (!profile) throw new GrabGoError("Member ID not recognized.");
    const user = await prisma.user.findUnique({ where: { email: profile.userEmail } });
    return {
      email: profile.userEmail,
      name: user?.name ?? profile.userEmail.split("@")[0],
      memberNumber: profile.memberNumber!,
    };
  }
  throw new GrabGoError("Provide a member ID, RFID, app unlock, or signed-in account.");
}

export function createAppUnlockToken(email: string): string {
  const payload = `${email.toLowerCase()}:${Date.now()}:${randomBytes(8).toString("hex")}`;
  return Buffer.from(payload).toString("base64url");
}

export function parseAppUnlockToken(token: string): { email: string } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [email, ts] = raw.split(":");
    if (!email || !ts) return null;
    const age = Date.now() - Number(ts);
    if (!Number.isFinite(age) || age > 15 * 60 * 1000) return null; // 15 min
    return { email: email.toLowerCase() };
  } catch {
    return null;
  }
}

export async function openGrabGoSession(input: {
  communityId?: string;
  machineCode: string;
  unlockMethod: UnlockMethod;
  memberEmail?: string;
  memberNumber?: string;
  unlockToken?: string;
  cardLast4?: string;
  rfidUid?: string;
}) {
  const machine = input.communityId
    ? await prisma.grabGoMachine.findFirst({
        where: { communityId: input.communityId, code: input.machineCode },
      })
    : await prisma.grabGoMachine.findUnique({
        where: { code: input.machineCode },
      });
  if (!machine) throw new GrabGoError("Machine not found.");
  if (machine.status !== "online") throw new GrabGoError("This stand is offline.");

  let member: { email: string; name: string; memberNumber: string };
  if (input.unlockMethod === "app_qr" || input.unlockMethod === "app_remote") {
    if (input.unlockToken) {
      const parsed = parseAppUnlockToken(input.unlockToken);
      if (!parsed) throw new GrabGoError("Unlock code expired. Refresh in the app.");
      member = await resolveMember({ memberEmail: parsed.email });
    } else if (input.memberEmail) {
      member = await resolveMember({ memberEmail: input.memberEmail });
    } else {
      throw new GrabGoError("App unlock required.");
    }
  } else if (input.unlockMethod === "member_id") {
    member = await resolveMember({ memberNumber: input.memberNumber });
  } else if (input.unlockMethod === "rfid") {
    if (!input.rfidUid?.trim()) {
      throw new GrabGoError("Tap your RFID fob or wristband on the reader.");
    }
    member = await resolveMember({ rfidUid: input.rfidUid });
  } else if (input.unlockMethod === "card_tap") {
    // Demo: card tap resolves via optional member email/number, else guest fails.
    if (input.memberEmail || input.memberNumber) {
      member = await resolveMember({
        memberEmail: input.memberEmail,
        memberNumber: input.memberNumber,
      });
    } else {
      throw new GrabGoError(
        "Card recognized. Link this card in Profile → Payment methods to unlock automatically.",
      );
    }
  } else {
    const _exhaustive: never = input.unlockMethod;
    throw new GrabGoError(`Unknown unlock method: ${_exhaustive}`);
  }

  const openExisting = await prisma.grabGoSession.findFirst({
    where: {
      machineId: machine.id,
      memberEmail: member.email,
      status: "open",
    },
  });
  if (openExisting) return { session: openExisting, machine, member, resumed: true };

  const session = await prisma.grabGoSession.create({
    data: {
      machineId: machine.id,
      communityId: machine.communityId,
      memberEmail: member.email,
      memberName: member.name,
      memberNumber: member.memberNumber,
      unlockMethod: input.unlockMethod,
      status: "open",
    },
  });

  const unlockNote =
    input.unlockMethod === "card_tap"
      ? `Door unlocked via card${input.cardLast4 ? ` •••• ${input.cardLast4}` : ""}. Cameras tracking.`
      : input.unlockMethod === "member_id"
        ? `Door unlocked via member ID ${member.memberNumber}. Cameras tracking.`
        : input.unlockMethod === "rfid"
          ? `Door unlocked via RFID ${input.rfidUid?.trim().toUpperCase()}. Cameras tracking.`
          : "Door unlocked via the club app. Cameras tracking.";

  await prisma.grabGoEvent.create({
    data: {
      sessionId: session.id,
      kind: "unlock",
      cameraNote: unlockNote,
    },
  });

  return { session, machine, member, resumed: false };
}

export async function recordVisionGrab(input: {
  sessionId: string;
  sku: string;
  quantity?: number;
  confidence?: number;
  kind?: "grab" | "return";
}) {
  const session = await prisma.grabGoSession.findUnique({
    where: { id: input.sessionId },
    include: { machine: { include: { products: true } } },
  });
  if (!session || session.status !== "open") {
    throw new GrabGoError("No open grab-and-go session.");
  }

  const product = session.machine.products.find((p) => p.sku === input.sku && p.active);
  if (!product) throw new GrabGoError("Product not recognized by vision system.");

  const qty = Math.max(1, input.quantity ?? 1);
  const kind = input.kind ?? "grab";
  const confidence = Math.min(1, Math.max(0.5, input.confidence ?? 0.92));

  const items = parseItems(session.itemsJson);
  const existing = items.find((i) => i.sku === product.sku);
  if (kind === "return") {
    if (existing) {
      existing.qty = Math.max(0, existing.qty - qty);
      if (existing.qty === 0) {
        const idx = items.indexOf(existing);
        items.splice(idx, 1);
      }
    }
  } else if (existing) {
    existing.qty += qty;
    existing.confidence = Math.max(existing.confidence, confidence);
  } else {
    items.push({
      sku: product.sku,
      name: product.name,
      qty,
      price: product.price,
      confidence,
    });
  }

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  await prisma.grabGoEvent.create({
    data: {
      sessionId: session.id,
      kind: kind === "return" ? "return" : "grab",
      sku: product.sku,
      productName: product.name,
      quantity: qty,
      confidence,
      cameraNote: `Camera ${session.machine.cameraDeviceId ?? "cam"}: ${kind} ${product.name} @ shelf ${product.shelfSlot} (${Math.round(confidence * 100)}% match).`,
    },
  });

  const updated = await prisma.grabGoSession.update({
    where: { id: session.id },
    data: { itemsJson: JSON.stringify(items.filter((i) => i.qty > 0)), total },
  });

  if (kind === "grab") {
    await prisma.grabGoProduct.update({
      where: { id: product.id },
      data: { stock: Math.max(0, product.stock - qty) },
    });
  } else {
    await prisma.grabGoProduct.update({
      where: { id: product.id },
      data: { stock: product.stock + qty },
    });
  }

  return { session: updated, items: parseItems(updated.itemsJson) };
}

/** Match a free-text camera observation to a catalog SKU, then record the grab. */
export async function recordVisionGrabFromNote(input: {
  sessionId: string;
  cameraNote: string;
  quantity?: number;
}) {
  const session = await prisma.grabGoSession.findUnique({
    where: { id: input.sessionId },
    include: { machine: { include: { products: true } } },
  });
  if (!session || session.status !== "open") {
    throw new GrabGoError("No open grab-and-go session.");
  }

  const catalog = session.machine.products
    .filter((p) => p.active)
    .map((p) => ({ sku: p.sku, name: p.name, category: p.category }));

  let match = matchProductHeuristic(input.cameraNote, catalog);
  if (isOpenAiConfigured()) {
    const ai = await openAiMatchProduct({
      cameraNote: input.cameraNote,
      catalog,
    });
    if (ai && catalog.some((c) => c.sku === ai.sku)) {
      const product = catalog.find((c) => c.sku === ai.sku)!;
      match = {
        sku: ai.sku,
        name: product.name,
        confidence: ai.confidence,
      };
    }
  }

  await prisma.grabGoEvent.create({
    data: {
      sessionId: session.id,
      kind: "vision_match",
      sku: match?.sku ?? null,
      productName: match?.name ?? null,
      quantity: input.quantity ?? 1,
      confidence: match?.confidence ?? 0,
      cameraNote: input.cameraNote,
    },
  });

  if (!match || match.confidence < 0.55) {
    throw new GrabGoError(
      "Vision could not confidently match a product — try again or select SKU.",
    );
  }

  return recordVisionGrab({
    sessionId: input.sessionId,
    sku: match.sku,
    quantity: input.quantity,
    confidence: match.confidence,
    kind: "grab",
  });
}

/** Member declares items in-app; when they open the door, vision confirms. */
export async function declareAppItems(input: {
  sessionId: string;
  lines: Array<{ sku: string; qty: number }>;
}) {
  for (const line of input.lines) {
    await recordVisionGrab({
      sessionId: input.sessionId,
      sku: line.sku,
      quantity: line.qty,
      confidence: 0.99,
      kind: "grab",
    });
  }
  return prisma.grabGoSession.findUnique({ where: { id: input.sessionId } });
}

export async function closeGrabGoSession(sessionId: string) {
  const session = await prisma.grabGoSession.findUnique({
    where: { id: sessionId },
    include: { machine: true },
  });
  if (!session) throw new GrabGoError("Session not found.");
  if (session.status === "closed") return { session, charge: null };

  const items = parseItems(session.itemsJson);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  await prisma.grabGoEvent.create({
    data: {
      sessionId: session.id,
      kind: "walk_out",
      cameraNote: "Door closed / member left zone. Settling basket.",
    },
  });

  let chargeId: string | null = null;
  if (total > 0) {
    const itemLabel = items.map((i) => `${i.qty}× ${i.name}`).join(", ");
    const paidByCard = session.unlockMethod === "card_tap";
    const charge = await prisma.memberCharge.create({
      data: {
        communityId: session.communityId,
        memberEmail: session.memberEmail,
        memberName: session.memberName,
        category: "grab_go",
        description: `${session.machine.name}: ${itemLabel}`,
        amount: total,
        status: paidByCard ? "paid" : "due",
        dueDate: new Date().toISOString().slice(0, 10),
        referenceType: "grab_go_session",
        referenceId: session.id,
      },
    });
    chargeId = charge.id;
    await recordFbSpend({
      communityId: session.communityId,
      memberEmail: session.memberEmail,
      amount: total,
    });
  }

  const closed = await prisma.grabGoSession.update({
    where: { id: session.id },
    data: {
      status: "closed",
      closedAt: new Date(),
      total,
      chargeId,
      itemsJson: JSON.stringify(items),
    },
    include: { events: { orderBy: { createdAt: "asc" } }, machine: true },
  });

  return { session: closed, chargeId };
}

export async function listMemberGrabGoSessions(memberEmail: string) {
  return prisma.grabGoSession.findMany({
    where: { memberEmail: memberEmail.toLowerCase() },
    include: { machine: true },
    orderBy: { unlockedAt: "desc" },
    take: 30,
  });
}

export async function getOpenSessionForMember(memberEmail: string, machineCode?: string) {
  return prisma.grabGoSession.findFirst({
    where: {
      memberEmail: memberEmail.toLowerCase(),
      status: "open",
      ...(machineCode ? { machine: { code: machineCode } } : {}),
    },
    include: {
      machine: { include: { products: { where: { active: true } } } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}
