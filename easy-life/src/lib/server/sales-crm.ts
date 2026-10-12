import { prisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/server/password";
import type { AuthUser } from "@/lib/types";

export type SalespersonRow = {
  id: string;
  userId: string;
  email: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  status: string;
  hireable: boolean;
  createdAt: string;
  activeAssignments: number;
};

export type AssignmentRow = {
  id: string;
  communityId: string;
  communityName: string;
  salespersonId: string;
  salespersonName: string;
  role: string;
  startedAt: string;
  endedAt: string | null;
  reason: string | null;
};

async function ensureDefaultCommissionPlan(): Promise<void> {
  const existing = await prisma.commissionPlan.findFirst({
    where: { active: true },
  });
  if (existing) return;
  await prisma.commissionPlan.create({
    data: {
      name: "Standard pyramid",
      active: true,
      closerPctContract: 20,
      managerPctContract: 5,
      directorPctContract: 2,
      closerPctResidual: 5,
      managerPctResidual: 1.5,
      directorPctResidual: 0.5,
    },
  });
}

export async function ensureSalesSeed(): Promise<void> {
  await ensureDefaultCommissionPlan();
}

export async function listSalespeople(): Promise<SalespersonRow[]> {
  await ensureSalesSeed();
  const rows = await prisma.salesperson.findMany({
    include: {
      user: { select: { email: true, name: true } },
      parent: { include: { user: { select: { name: true } } } },
      assignments: { where: { endedAt: null }, select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    email: r.user.email,
    name: r.user.name,
    parentId: r.parentId,
    parentName: r.parent?.user.name ?? null,
    status: r.status,
    hireable: r.hireable,
    createdAt: r.createdAt.toISOString(),
    activeAssignments: r.assignments.length,
  }));
}

export async function createSalesperson(input: {
  email: string;
  name: string;
  password: string;
  parentId?: string | null;
  hireable?: boolean;
}): Promise<SalespersonRow | { error: string }> {
  await ensureSalesSeed();
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const already = await prisma.salesperson.findUnique({
      where: { userId: existing.id },
    });
    if (already) return { error: "This user is already a salesperson" };
  }

  if (input.parentId) {
    const parent = await prisma.salesperson.findUnique({
      where: { id: input.parentId },
    });
    if (!parent || parent.status !== "active") {
      return { error: "Upline salesperson not found" };
    }
    if (!parent.hireable) {
      return { error: "Upline cannot hire downline" };
    }
  }

  let userId: string;
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "sales", name: input.name.trim() || existing.name },
    });
    userId = existing.id;
  } else {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashPassword(input.password),
        role: "sales",
        name: input.name.trim(),
        communityId: null,
        status: "active",
      },
    });
    userId = user.id;
  }

  const created = await prisma.salesperson.create({
    data: {
      userId,
      parentId: input.parentId ?? null,
      hireable: input.hireable ?? true,
      status: "active",
    },
    include: {
      user: { select: { email: true, name: true } },
      parent: { include: { user: { select: { name: true } } } },
      assignments: { where: { endedAt: null }, select: { id: true } },
    },
  });

  return {
    id: created.id,
    userId: created.userId,
    email: created.user.email,
    name: created.user.name,
    parentId: created.parentId,
    parentName: created.parent?.user.name ?? null,
    status: created.status,
    hireable: created.hireable,
    createdAt: created.createdAt.toISOString(),
    activeAssignments: created.assignments.length,
  };
}

export async function hireDownline(input: {
  hiringSalespersonId: string;
  email: string;
  name: string;
  password: string;
}): Promise<SalespersonRow | { error: string }> {
  const hiring = await prisma.salesperson.findUnique({
    where: { id: input.hiringSalespersonId },
  });
  if (!hiring || hiring.status !== "active") {
    return { error: "Salesperson not found" };
  }
  if (!hiring.hireable) return { error: "You cannot hire downline" };
  return createSalesperson({
    email: input.email,
    name: input.name,
    password: input.password,
    parentId: hiring.id,
  });
}

export async function assignCommunityOwner(input: {
  communityId: string;
  salespersonId: string;
  reason?: string;
  role?: "owner" | "support";
}): Promise<AssignmentRow | { error: string }> {
  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { id: true, name: true },
  });
  if (!community) return { error: "Community not found" };

  const sp = await prisma.salesperson.findUnique({
    where: { id: input.salespersonId },
    include: { user: { select: { name: true } } },
  });
  if (!sp || sp.status !== "active") {
    return { error: "Salesperson not found" };
  }

  const role = input.role ?? "owner";
  if (role === "owner") {
    await prisma.communitySalesAssignment.updateMany({
      where: {
        communityId: input.communityId,
        role: "owner",
        endedAt: null,
      },
      data: {
        endedAt: new Date(),
        reason: input.reason?.trim() || "Reassigned",
      },
    });
  }

  const row = await prisma.communitySalesAssignment.create({
    data: {
      communityId: input.communityId,
      salespersonId: input.salespersonId,
      role,
      reason: input.reason?.trim() || null,
    },
  });

  return {
    id: row.id,
    communityId: community.id,
    communityName: community.name,
    salespersonId: sp.id,
    salespersonName: sp.user.name,
    role: row.role,
    startedAt: row.startedAt.toISOString(),
    endedAt: null,
    reason: row.reason,
  };
}

export async function listAssignments(opts?: {
  communityId?: string;
  salespersonId?: string;
  activeOnly?: boolean;
}): Promise<AssignmentRow[]> {
  const rows = await prisma.communitySalesAssignment.findMany({
    where: {
      ...(opts?.communityId ? { communityId: opts.communityId } : {}),
      ...(opts?.salespersonId ? { salespersonId: opts.salespersonId } : {}),
      ...(opts?.activeOnly ? { endedAt: null } : {}),
    },
    include: {
      salesperson: { include: { user: { select: { name: true } } } },
    },
    orderBy: { startedAt: "desc" },
  });

  const communityIds = [...new Set(rows.map((r) => r.communityId))];
  const communities = await prisma.community.findMany({
    where: { id: { in: communityIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(communities.map((c) => [c.id, c.name]));

  return rows.map((r) => ({
    id: r.id,
    communityId: r.communityId,
    communityName: nameById.get(r.communityId) ?? r.communityId,
    salespersonId: r.salespersonId,
    salespersonName: r.salesperson.user.name,
    role: r.role,
    startedAt: r.startedAt.toISOString(),
    endedAt: r.endedAt?.toISOString() ?? null,
    reason: r.reason,
  }));
}

export async function findSalespersonByUserId(
  userId: string,
): Promise<{ id: string; parentId: string | null } | null> {
  return prisma.salesperson.findUnique({
    where: { userId },
    select: { id: true, parentId: true },
  });
}

export async function getActiveOwnerSalespersonId(
  communityId: string,
): Promise<string | null> {
  const row = await prisma.communitySalesAssignment.findFirst({
    where: { communityId, role: "owner", endedAt: null },
    select: { salespersonId: true },
  });
  return row?.salespersonId ?? null;
}

/** Walk up to 2 parents (manager, director). */
export async function getUplineChain(
  closerId: string,
): Promise<{ closerId: string; managerId: string | null; directorId: string | null }> {
  const closer = await prisma.salesperson.findUnique({
    where: { id: closerId },
    select: { id: true, parentId: true },
  });
  if (!closer) {
    return { closerId, managerId: null, directorId: null };
  }
  let managerId: string | null = closer.parentId;
  let directorId: string | null = null;
  if (managerId) {
    const manager = await prisma.salesperson.findUnique({
      where: { id: managerId },
      select: { parentId: true },
    });
    directorId = manager?.parentId ?? null;
  }
  return { closerId: closer.id, managerId, directorId };
}

export type { AuthUser };
