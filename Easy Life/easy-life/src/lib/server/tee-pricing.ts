import { prisma } from "@/lib/server/prisma";
import { ensureRecordsSeeded } from "@/lib/server/records";

export interface TeePricingRuleDTO {
  id: string;
  amenityId: string | null;
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  multiplier: number;
  flatAdjustment: number;
  active: boolean;
}

const DEFAULT_RULES: Omit<TeePricingRuleDTO, "id">[] = [
  {
    amenityId: null,
    name: "Twilight",
    dayOfWeek: "*",
    startTime: "15:00",
    endTime: "18:00",
    multiplier: 0.75,
    flatAdjustment: 0,
    active: true,
  },
  {
    amenityId: null,
    name: "Weekend Peak",
    dayOfWeek: "6",
    startTime: "07:00",
    endTime: "11:00",
    multiplier: 1.25,
    flatAdjustment: 0,
    active: true,
  },
];

export async function ensureDefaultPricingRules(communityId: string): Promise<void> {
  await ensureRecordsSeeded();
  const count = await prisma.teePricingRule.count({ where: { communityId } });
  if (count > 0) return;
  for (const rule of DEFAULT_RULES) {
    await prisma.teePricingRule.create({ data: { communityId, ...rule } });
  }
}

export async function listPricingRules(communityId: string): Promise<TeePricingRuleDTO[]> {
  await ensureDefaultPricingRules(communityId);
  return prisma.teePricingRule.findMany({
    where: { communityId },
    orderBy: { name: "asc" },
  });
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function dayMatches(ruleDay: string, date: string): boolean {
  if (ruleDay === "*") return true;
  const d = new Date(`${date}T12:00:00`);
  return String(d.getDay()) === ruleDay;
}

/** Apply dynamic pricing to base amenity fee. */
export async function calculateDynamicPrice(input: {
  communityId: string;
  amenityId?: string;
  baseFee: number;
  date: string;
  startTime: string;
}): Promise<{ finalFee: number; appliedRule: string | null }> {
  await ensureDefaultPricingRules(input.communityId);
  const rules = await prisma.teePricingRule.findMany({
    where: {
      communityId: input.communityId,
      active: true,
      OR: [{ amenityId: input.amenityId ?? undefined }, { amenityId: null }],
    },
  });

  const slotMin = timeToMinutes(input.startTime);
  let best: { name: string; fee: number } | null = null;

  for (const rule of rules) {
    if (!dayMatches(rule.dayOfWeek, input.date)) continue;
    const start = timeToMinutes(rule.startTime);
    const end = timeToMinutes(rule.endTime);
    if (slotMin < start || slotMin >= end) continue;
    const fee = Math.max(0, input.baseFee * rule.multiplier + rule.flatAdjustment);
    if (!best || fee !== input.baseFee) {
      best = { name: rule.name, fee: Math.round(fee * 100) / 100 };
    }
  }

  if (!best) return { finalFee: input.baseFee, appliedRule: null };
  return { finalFee: best.fee, appliedRule: best.name };
}

export async function upsertPricingRule(input: {
  id?: string;
  communityId: string;
  amenityId?: string;
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  multiplier: number;
  flatAdjustment: number;
  active?: boolean;
}) {
  if (input.id) {
    return prisma.teePricingRule.update({
      where: { id: input.id },
      data: input,
    });
  }
  return prisma.teePricingRule.create({ data: { ...input, active: input.active ?? true } });
}
