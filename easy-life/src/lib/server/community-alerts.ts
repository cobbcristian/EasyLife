import { prisma } from "@/lib/server/prisma";
import { sendPushToUser } from "@/lib/server/push";

export async function listActiveAlerts(communityId: string) {
  return prisma.communityAlert.findMany({
    where: { communityId, active: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

export async function notifyCommunityAlert(
  communityId: string,
  message: string,
  detail: string,
) {
  const [members, residents] = await Promise.all([
    prisma.userCommunity.findMany({
      where: { communityId, status: "active" },
      select: { user: { select: { email: true } } },
      take: 400,
    }),
    prisma.user.findMany({
      where: { communityId, status: "active" },
      select: { email: true },
      take: 400,
    }),
  ]);
  const emails = [
    ...new Set([
      ...members.map((row) => row.user.email),
      ...residents.map((row) => row.email),
    ]),
  ];
  const payload = {
    title: message,
    body: detail || "Open Barnaby to see this community alert.",
    url: "/member",
  };
  for (let i = 0; i < emails.length; i += 20) {
    const chunk = emails.slice(i, i + 20);
    await Promise.all(
      chunk.map((email) => sendPushToUser(email, payload).catch(() => 0)),
    );
  }
  return emails.length;
}
