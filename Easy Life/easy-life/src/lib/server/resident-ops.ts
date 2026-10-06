import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { prisma } from "@/lib/server/prisma";

export function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function requireMember() {
  const session = await getSession();
  if (!session || session.role !== "member" || !session.communityId) return null;
  return session;
}

export async function requireStaffCommunity() {
  const session = await getSession();
  if (!session || (session.role !== "pm" && session.role !== "admin" && session.role !== "board")) {
    return null;
  }
  const communityId = await resolveScopedCommunityId(session);
  return { session, communityId };
}

export async function unitFor(email: string): Promise<string> {
  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: email },
    select: { unit: true },
  });
  return profile?.unit ?? "";
}
