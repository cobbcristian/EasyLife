import { prisma } from "@/lib/server/prisma";
import { ensureRecordsSeeded } from "@/lib/server/records";

export async function checkInMember(input: {
  communityId: string;
  memberEmail: string;
  memberName: string;
  facility: string;
  method?: "manual" | "app" | "beacon" | "kiosk";
  beaconId?: string;
}) {
  await ensureRecordsSeeded();
  return prisma.activityCheckIn.create({
    data: {
      communityId: input.communityId,
      memberEmail: input.memberEmail.toLowerCase(),
      memberName: input.memberName,
      facility: input.facility,
      method: input.method ?? "app",
      beaconId: input.beaconId,
    },
  });
}

export async function listRecentCheckIns(communityId: string, limit = 50) {
  return prisma.activityCheckIn.findMany({
    where: { communityId },
    orderBy: { checkedInAt: "desc" },
    take: limit,
  });
}

export async function listMemberCheckIns(memberEmail: string, limit = 20) {
  return prisma.activityCheckIn.findMany({
    where: { memberEmail: memberEmail.toLowerCase() },
    orderBy: { checkedInAt: "desc" },
    take: limit,
  });
}

export async function getFacilityAttendance(communityId: string, facility: string, date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59`);
  return prisma.activityCheckIn.count({
    where: {
      communityId,
      facility,
      checkedInAt: { gte: start, lte: end },
    },
  });
}

/** Beacon check-in: facility inferred from beacon registry (simple map). */
const BEACON_FACILITIES: Record<string, string> = {
  "beacon-fitness-1": "Fitness Center",
  "beacon-pool-1": "Pool",
  "beacon-tennis-1": "Tennis Pavilion",
  "beacon-golf-1": "Golf Starter",
};

export function facilityForBeacon(beaconId: string): string | null {
  return BEACON_FACILITIES[beaconId] ?? null;
}
