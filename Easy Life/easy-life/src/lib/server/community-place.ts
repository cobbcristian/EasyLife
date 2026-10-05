import { prisma } from "@/lib/server/prisma";

export async function attachCommunityPlace<T extends { communityId: string }>(
  rows: T[],
): Promise<Array<T & { communityName: string; location: string }>> {
  const ids = [...new Set(rows.map((row) => row.communityId))];
  const communities =
    ids.length === 0
      ? []
      : await prisma.community.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, location: true },
        });
  const byId = new Map(communities.map((c) => [c.id, c]));
  return rows.map((row) => {
    const place = byId.get(row.communityId);
    const communityName = place?.name ?? row.communityId;
    const location = place?.location?.trim() || communityName;
    return { ...row, communityName, location };
  });
}
