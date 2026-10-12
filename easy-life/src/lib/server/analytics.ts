import { prisma } from "@/lib/server/prisma";

export interface EngagementPoint {
  label: string;
  value: number;
}

export async function getDashboardAnalytics(communityId?: string | null): Promise<{
  engagement: EngagementPoint[];
  avgEngagement: number;
  tabUsage: { serviceBooking: number; mapViews: number };
}> {
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const communities = await prisma.community.findMany({
    where: communityId ? { id: communityId } : undefined,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const engagement: EngagementPoint[] = [];
  for (const c of communities) {
    const [bookings, requests, logs] = await Promise.all([
      prisma.booking.count({ where: { communityId: c.id, createdAt: { gte: since } } }),
      prisma.serviceRequest.count({ where: { communityId: c.id, createdAt: { gte: since } } }),
      prisma.accessLog.count({ where: { communityId: c.id, createdAt: { gte: since } } }),
    ]);
    const short = c.name.length > 12 ? c.name.slice(0, 10) + "…" : c.name;
    engagement.push({ label: short, value: bookings + requests + logs });
  }

  if (engagement.length === 0) {
    engagement.push({ label: "No data", value: 0 });
  }

  const avgEngagement =
    engagement.length > 0
      ? Math.round(engagement.reduce((s, p) => s + p.value, 0) / engagement.length)
      : 0;

  const actionCounts = await prisma.accessLog.groupBy({
    by: ["action"],
    _count: { _all: true },
    where: {
      createdAt: { gte: since },
      ...(communityId ? { communityId } : {}),
    },
  });

  let bookingActions = 0;
  let otherActions = 0;
  for (const row of actionCounts) {
    if (row.action === "Booking" || row.action === "Service request") {
      bookingActions += row._count._all;
    } else {
      otherActions += row._count._all;
    }
  }
  const total = bookingActions + otherActions || 1;

  return {
    engagement,
    avgEngagement,
    tabUsage: {
      serviceBooking: Math.round((bookingActions / total) * 100),
      mapViews: Math.round((otherActions / total) * 100),
    },
  };
}
