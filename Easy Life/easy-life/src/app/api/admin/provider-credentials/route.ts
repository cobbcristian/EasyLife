import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { prisma } from "@/lib/server/prisma";
import { privateFileHref } from "@/lib/server/storage";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "pm" && session.role !== "board")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const rows = await prisma.providerCredential.findMany({
    where: { communityId },
    orderBy: { createdAt: "desc" },
    include: { provider: { select: { name: true, category: true, email: true } } },
  });
  return NextResponse.json({
    credentials: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      fileName: row.fileName,
      url: privateFileHref(row.url) ?? row.url,
      providerName: row.provider.name,
      providerCategory: row.provider.category,
      providerEmail: row.provider.email,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}
