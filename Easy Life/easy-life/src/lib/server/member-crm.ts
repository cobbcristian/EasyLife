import { prisma } from "@/lib/server/prisma";
import { ensureRecordsSeeded } from "@/lib/server/records";

export interface CrmProspectDTO {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string;
  notes: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  activityCount: number;
}

function toDto(row: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string;
  notes: string;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { activities: number };
}): CrmProspectDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    stage: row.stage,
    source: row.source,
    notes: row.notes,
    assignedTo: row.assignedTo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    activityCount: row._count?.activities ?? 0,
  };
}

export async function listProspects(communityId: string, stage?: string): Promise<CrmProspectDTO[]> {
  await ensureRecordsSeeded();
  const rows = await prisma.crmProspect.findMany({
    where: { communityId, ...(stage ? { stage } : {}) },
    include: { _count: { select: { activities: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toDto);
}

export async function createProspect(input: {
  communityId: string;
  name: string;
  email?: string;
  phone?: string;
  stage?: string;
  source?: string;
  notes?: string;
  assignedTo?: string;
}): Promise<CrmProspectDTO> {
  const row = await prisma.crmProspect.create({
    data: {
      communityId: input.communityId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      stage: input.stage ?? "lead",
      source: input.source ?? "website",
      notes: input.notes ?? "",
      assignedTo: input.assignedTo,
    },
    include: { _count: { select: { activities: true } } },
  });
  return toDto(row);
}

export async function updateProspectStage(
  id: string,
  stage: string,
  communityId: string,
): Promise<CrmProspectDTO | null> {
  const existing = await prisma.crmProspect.findFirst({
    where: { id, communityId },
  });
  if (!existing) return null;

  const row = await prisma.crmProspect.update({
    where: { id },
    data: { stage },
    include: { _count: { select: { activities: true } } },
  });
  return toDto(row);
}

export async function addCrmActivity(input: {
  prospectId: string;
  communityId: string;
  type: string;
  subject: string;
  body?: string;
  createdBy: string;
}) {
  const prospect = await prisma.crmProspect.findFirst({
    where: { id: input.prospectId, communityId: input.communityId },
  });
  if (!prospect) {
    throw new Error("Prospect not found");
  }
  return prisma.crmActivity.create({
    data: {
      prospectId: input.prospectId,
      type: input.type,
      subject: input.subject,
      body: input.body ?? "",
      createdBy: input.createdBy,
    },
  });
}

export async function listCrmActivities(prospectId: string) {
  return prisma.crmActivity.findMany({
    where: { prospectId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCrmPipelineSummary(communityId: string) {
  const stages = ["lead", "prospect", "tour", "application", "member", "lost"] as const;
  const counts = await Promise.all(
    stages.map(async (stage) => ({
      stage,
      count: await prisma.crmProspect.count({ where: { communityId, stage } }),
    })),
  );
  return counts;
}
