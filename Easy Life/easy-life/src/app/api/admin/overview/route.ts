import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { adminOverviewCommunityScope } from "@/lib/server/admin-overview-scope";
import { isSuperAdmin } from "@/lib/server/community-context";
import { ensureRecordsSeeded } from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();

  const communityScope = adminOverviewCommunityScope(session);
  const bookingWhere =
    communityScope === null
      ? { status: { not: "cancelled" as const } }
      : { status: { not: "cancelled" as const }, communityId: communityScope };
  const userWhere =
    communityScope === null ? undefined : { communityId: communityScope };
  const providerWhere =
    communityScope === null ? undefined : { communityId: communityScope };
  const contactWhere =
    communityScope === null
      ? { status: "unread" as const }
      : { status: "unread" as const, communityId: communityScope };

  const [bookings, users, providers, communities, contactUnread] =
    await Promise.all([
      prisma.booking.findMany({
        where: bookingWhere,
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.user.findMany({
        where: userWhere,
        orderBy: { name: "asc" },
        take: 300,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          communityId: true,
        },
      }),
      prisma.provider.findMany({
        where: providerWhere,
        orderBy: { name: "asc" },
        take: 200,
        select: {
          id: true,
          name: true,
          email: true,
          category: true,
          communityId: true,
          status: true,
          type: true,
        },
      }),
      communityScope === null
        ? prisma.community.findMany({
            select: { id: true, name: true },
          })
        : prisma.community.findMany({
            where: { id: communityScope },
            select: { id: true, name: true },
          }),
      prisma.contactMessage.count({
        where: contactWhere,
      }),
    ]);

  const communityName = new Map(communities.map((c) => [c.id, c.name]));

  return NextResponse.json({
    isSuperAdmin: isSuperAdmin(session),
    stats: {
      bookings: bookings.length,
      members: users.filter((u) => u.role === "member").length,
      providers: providers.length,
      communities: communities.length,
      unreadMessages: contactUnread,
    },
    bookings: bookings.map((b) => ({
      id: b.id,
      amenity: b.amenity,
      memberName: b.memberName,
      memberEmail: b.memberEmail,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      communityId: b.communityId,
      communityName: communityName.get(b.communityId) ?? b.communityId,
    })),
    members: users.map((u) => ({
      ...u,
      communityName: u.communityId
        ? communityName.get(u.communityId) ?? u.communityId
        : "Platform",
    })),
    providers: providers.map((p) => ({
      ...p,
      communityName: communityName.get(p.communityId) ?? p.communityId,
    })),
  });
}
