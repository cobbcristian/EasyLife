import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { summarizeInbox } from "@/lib/server/ai/inbox-summary";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.memberInboxItem.findMany({
    where: { userEmail: session.email.toLowerCase(), read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const result = await summarizeInbox(
    items.map((i) => ({ title: i.title, body: i.body })),
  );
  return NextResponse.json(result);
}
