import { prisma } from "@/lib/server/prisma";
import {
  ensureSalesSeed,
  getActiveOwnerSalespersonId,
  getUplineChain,
} from "@/lib/server/sales-crm";

export type CommissionEventType =
  | "community_contract"
  | "resident_activation"
  | "provider_activation";

const RESIDUAL_DEFAULT_GROSS = 50; // USD when no explicit amount

async function getActivePlan() {
  await ensureSalesSeed();
  return prisma.commissionPlan.findFirst({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
}

function pctFor(
  plan: {
    closerPctContract: number;
    managerPctContract: number;
    directorPctContract: number;
    closerPctResidual: number;
    managerPctResidual: number;
    directorPctResidual: number;
  },
  type: CommissionEventType,
  level: 0 | 1 | 2,
): number {
  const contract = type === "community_contract";
  if (level === 0) return contract ? plan.closerPctContract : plan.closerPctResidual;
  if (level === 1) return contract ? plan.managerPctContract : plan.managerPctResidual;
  return contract ? plan.directorPctContract : plan.directorPctResidual;
}

/**
 * Record a commission event and split to closer + up to 2 parents.
 * Idempotent-ish for activations: skips if same type+sourceId already exists.
 */
export async function recordCommissionEvent(input: {
  type: CommissionEventType;
  communityId: string;
  sourceId?: string | null;
  amountGross?: number;
}): Promise<{ eventId: string; lines: number } | { skipped: true } | { error: string }> {
  if (input.sourceId) {
    const dup = await prisma.commissionEvent.findFirst({
      where: {
        type: input.type,
        communityId: input.communityId,
        sourceId: input.sourceId,
      },
      select: { id: true },
    });
    if (dup) return { skipped: true };
  }

  const closerId = await getActiveOwnerSalespersonId(input.communityId);
  if (!closerId) {
    return { error: "No sales owner assigned to this community" };
  }

  const plan = await getActivePlan();
  if (!plan) return { error: "No active commission plan" };

  const amountGross =
    input.amountGross ??
    (input.type === "community_contract" ? 0 : RESIDUAL_DEFAULT_GROSS);
  if (amountGross <= 0 && input.type === "community_contract") {
    return { error: "Contract value required" };
  }

  const chain = await getUplineChain(closerId);
  const event = await prisma.commissionEvent.create({
    data: {
      type: input.type,
      communityId: input.communityId,
      sourceId: input.sourceId ?? null,
      amountGross,
      planId: plan.id,
    },
  });

  const beneficiaries: Array<{ salespersonId: string; level: 0 | 1 | 2 }> = [
    { salespersonId: chain.closerId, level: 0 },
  ];
  if (chain.managerId) {
    beneficiaries.push({ salespersonId: chain.managerId, level: 1 });
  }
  if (chain.directorId) {
    beneficiaries.push({ salespersonId: chain.directorId, level: 2 });
  }

  const lineData = beneficiaries.map((b) => {
    const pct = pctFor(plan, input.type, b.level);
    return {
      eventId: event.id,
      salespersonId: b.salespersonId,
      level: b.level,
      amount: Math.round(((amountGross * pct) / 100) * 100) / 100,
      status: "pending",
    };
  }).filter((l) => l.amount > 0);

  if (lineData.length > 0) {
    await prisma.commissionLine.createMany({ data: lineData });
  }

  return { eventId: event.id, lines: lineData.length };
}

/** Mark community contract closed and fire commission. */
export async function closeCommunityContract(input: {
  communityId: string;
  contractValueUsd: number;
}): Promise<{ ok: true; eventId?: string } | { error: string }> {
  if (!(input.contractValueUsd > 0)) {
    return { error: "contractValueUsd must be positive" };
  }

  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { id: true, contractClosedAt: true },
  });
  if (!community) return { error: "Community not found" };

  if (!community.contractClosedAt) {
    await prisma.community.update({
      where: { id: input.communityId },
      data: {
        contractClosedAt: new Date(),
        contractValueUsd: input.contractValueUsd,
      },
    });
  } else {
    await prisma.community.update({
      where: { id: input.communityId },
      data: { contractValueUsd: input.contractValueUsd },
    });
  }

  const result = await recordCommissionEvent({
    type: "community_contract",
    communityId: input.communityId,
    sourceId: `contract:${input.communityId}`,
    amountGross: input.contractValueUsd,
  });

  if ("error" in result) return { error: result.error };
  if ("skipped" in result) return { ok: true };
  return { ok: true, eventId: result.eventId };
}

export async function recordResidentActivation(input: {
  communityId: string;
  userId: string;
  amountGross?: number;
}) {
  return recordCommissionEvent({
    type: "resident_activation",
    communityId: input.communityId,
    sourceId: `resident:${input.userId}`,
    amountGross: input.amountGross ?? RESIDUAL_DEFAULT_GROSS,
  });
}

export async function recordProviderActivation(input: {
  communityId: string;
  userId: string;
  amountGross?: number;
}) {
  return recordCommissionEvent({
    type: "provider_activation",
    communityId: input.communityId,
    sourceId: `provider:${input.userId}`,
    amountGross: input.amountGross ?? RESIDUAL_DEFAULT_GROSS,
  });
}

export type CommissionLineReport = {
  id: string;
  amount: number;
  level: number;
  status: string;
  createdAt: string;
  eventType: string;
  communityId: string;
  communityName: string;
  amountGross: number;
  salespersonId: string;
  salespersonName: string;
};

export async function listCommissionLines(opts: {
  salespersonId?: string;
  /** Include downline (children + grandchildren) when set with salespersonId */
  includeDownline?: boolean;
  communityId?: string;
  status?: string;
}): Promise<CommissionLineReport[]> {
  let salespersonIds: string[] | undefined;
  if (opts.salespersonId) {
    salespersonIds = [opts.salespersonId];
    if (opts.includeDownline) {
      const children = await prisma.salesperson.findMany({
        where: { parentId: opts.salespersonId },
        select: { id: true },
      });
      const childIds = children.map((c) => c.id);
      salespersonIds.push(...childIds);
      if (childIds.length) {
        const grand = await prisma.salesperson.findMany({
          where: { parentId: { in: childIds } },
          select: { id: true },
        });
        salespersonIds.push(...grand.map((g) => g.id));
      }
    }
  }

  const lines = await prisma.commissionLine.findMany({
    where: {
      ...(salespersonIds ? { salespersonId: { in: salespersonIds } } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.communityId
        ? { event: { communityId: opts.communityId } }
        : {}),
    },
    include: {
      event: true,
      salesperson: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const communityIds = [...new Set(lines.map((l) => l.event.communityId))];
  const communities = await prisma.community.findMany({
    where: { id: { in: communityIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(communities.map((c) => [c.id, c.name]));

  return lines.map((l) => ({
    id: l.id,
    amount: l.amount,
    level: l.level,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
    eventType: l.event.type,
    communityId: l.event.communityId,
    communityName: nameById.get(l.event.communityId) ?? l.event.communityId,
    amountGross: l.event.amountGross,
    salespersonId: l.salespersonId,
    salespersonName: l.salesperson.user.name,
  }));
}

export async function markCommissionLinesPaid(
  lineIds: string[],
): Promise<number> {
  const result = await prisma.commissionLine.updateMany({
    where: { id: { in: lineIds }, status: { in: ["pending", "payable"] } },
    data: { status: "paid" },
  });
  return result.count;
}
