import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, listMenuItems } from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";
import { MenuClient } from "./menu-client";

export const dynamic = "force-dynamic";

export default async function ProviderMenuPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  const rows = session ? await listMenuItems(session.email) : [];
  const provider =
    session?.communityId && session.role === "provider"
      ? await prisma.provider.findFirst({
          where: { communityId: session.communityId, name: session.name },
          select: { category: true },
        })
      : null;
  const initial = rows.map((m) => ({
    id: m.id,
    name: m.name,
    price: m.price,
    category: m.category,
    available: m.available,
  }));
  return (
    <MenuClient
      initial={initial}
      isCleaningProvider={provider?.category.toLowerCase() === "cleaning"}
    />
  );
}
