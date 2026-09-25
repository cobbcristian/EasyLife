import { prisma } from "@/lib/server/prisma";
import { ensureRecordsSeeded } from "@/lib/server/records";

export interface PosChitLineDTO {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface PosChitDTO {
  id: string;
  memberEmail: string;
  memberName: string;
  location: string;
  serverName: string | null;
  status: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  lines: PosChitLineDTO[];
  createdAt: string;
}

function recalcTotals(lines: { qty: number; unitPrice: number }[], tip = 0) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const tax = Math.round(subtotal * 0.07 * 100) / 100;
  const total = Math.round((subtotal + tax + tip) * 100) / 100;
  return { subtotal, tax, total };
}

function toDto(
  chit: {
    id: string;
    memberEmail: string;
    memberName: string;
    location: string;
    serverName: string | null;
    status: string;
    subtotal: number;
    tax: number;
    tip: number;
    total: number;
    createdAt: Date;
    lines: { id: string; name: string; qty: number; unitPrice: number; total: number }[];
  },
): PosChitDTO {
  return {
    id: chit.id,
    memberEmail: chit.memberEmail,
    memberName: chit.memberName,
    location: chit.location,
    serverName: chit.serverName,
    status: chit.status,
    subtotal: chit.subtotal,
    tax: chit.tax,
    tip: chit.tip,
    total: chit.total,
    lines: chit.lines.map((l) => ({
      id: l.id,
      name: l.name,
      qty: l.qty,
      unitPrice: l.unitPrice,
      total: l.total,
    })),
    createdAt: chit.createdAt.toISOString(),
  };
}

export async function createPosChit(input: {
  communityId: string;
  memberEmail: string;
  memberName: string;
  location?: string;
  serverName?: string;
  lines: { name: string; qty: number; unitPrice: number; menuItemId?: string }[];
  tip?: number;
}): Promise<PosChitDTO> {
  await ensureRecordsSeeded();
  if (!input.lines.length) {
    throw new Error("Chit requires at least one line");
  }
  for (const line of input.lines) {
    if (!Number.isFinite(line.qty) || line.qty <= 0) {
      throw new Error("Line quantity must be a positive number");
    }
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
      throw new Error("Line unit price cannot be negative");
    }
  }
  const tip = input.tip ?? 0;
  if (!Number.isFinite(tip) || tip < 0) {
    throw new Error("Tip cannot be negative");
  }
  const lineData = input.lines.map((l) => ({
    name: l.name,
    qty: l.qty,
    unitPrice: l.unitPrice,
    total: l.qty * l.unitPrice,
    menuItemId: l.menuItemId,
  }));
  const { subtotal, tax, total } = recalcTotals(lineData, tip);
  if (!(total > 0)) {
    throw new Error("Chit total must be greater than zero");
  }

  const chit = await prisma.posChit.create({
    data: {
      communityId: input.communityId,
      memberEmail: input.memberEmail.toLowerCase(),
      memberName: input.memberName,
      location: input.location ?? "Clubhouse",
      serverName: input.serverName,
      subtotal,
      tax,
      tip,
      total,
      lines: { create: lineData },
    },
    include: { lines: true },
  });
  return toDto(chit);
}

export async function listOpenChits(communityId: string): Promise<PosChitDTO[]> {
  await ensureRecordsSeeded();
  const rows = await prisma.posChit.findMany({
    where: { communityId, status: { in: ["open", "posted"] } },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDto);
}

export async function listMemberChits(memberEmail: string): Promise<PosChitDTO[]> {
  const rows = await prisma.posChit.findMany({
    where: { memberEmail: memberEmail.toLowerCase() },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map(toDto);
}

/** Post chit to member account as a charge. */
export async function postPosChitToAccount(
  chitId: string,
  postedBy: string,
): Promise<PosChitDTO | null> {
  const chit = await prisma.posChit.findUnique({
    where: { id: chitId },
    include: { lines: true },
  });
  if (!chit || chit.status !== "open") return null;

  const charge = await prisma.memberCharge.create({
    data: {
      communityId: chit.communityId,
      memberEmail: chit.memberEmail,
      memberName: chit.memberName,
      category: "dining",
      description: `POS — ${chit.location} (${chit.lines.length} items)`,
      amount: chit.total,
      status: "due",
      referenceType: "pos_chit",
      referenceId: chit.id,
    },
  });

  const updated = await prisma.posChit.update({
    where: { id: chitId },
    data: { status: "posted", chargeId: charge.id, postedAt: new Date() },
    include: { lines: true },
  });

  await prisma.accessLog.create({
    data: {
      communityId: chit.communityId,
      userName: postedBy,
      action: "POS Post",
      detail: `Chit ${chitId} → $${chit.total.toFixed(2)}`,
    },
  });

  return toDto(updated);
}

export async function voidPosChit(chitId: string): Promise<boolean> {
  const chit = await prisma.posChit.findUnique({ where: { id: chitId } });
  if (!chit || chit.status === "paid") return false;
  await prisma.posChit.update({ where: { id: chitId }, data: { status: "void" } });
  return true;
}
