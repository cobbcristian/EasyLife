import { planPosChitVoid } from "@/lib/pos-chit-void-policy";
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
  const lineData = input.lines.map((l) => ({
    name: l.name,
    qty: l.qty,
    unitPrice: l.unitPrice,
    total: l.qty * l.unitPrice,
    menuItemId: l.menuItemId,
  }));
  const { subtotal, tax, total } = recalcTotals(lineData, input.tip ?? 0);

  const chit = await prisma.posChit.create({
    data: {
      communityId: input.communityId,
      memberEmail: input.memberEmail.toLowerCase(),
      memberName: input.memberName,
      location: input.location ?? "Clubhouse",
      serverName: input.serverName,
      subtotal,
      tax,
      tip: input.tip ?? 0,
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
  if (!chit) return false;

  const charge = chit.chargeId
    ? await prisma.memberCharge.findUnique({ where: { id: chit.chargeId } })
    : null;
  const plan = planPosChitVoid({
    chitStatus: chit.status,
    chargeId: chit.chargeId,
    chargeStatus: charge?.status,
  });
  if (!plan.voidChit) return false;

  await prisma.posChit.update({ where: { id: chitId }, data: { status: "void" } });

  // Posted tabs create a due MemberCharge — voiding the chit must cancel that
  // invoice or the member keeps getting billed for a voided POS check.
  if (plan.cancelDueCharge && chit.chargeId) {
    await prisma.memberCharge.updateMany({
      where: {
        id: chit.chargeId,
        status: "due",
        referenceType: "pos_chit",
        referenceId: chit.id,
      },
      data: { status: "cancelled" },
    });
  }

  return true;
}
