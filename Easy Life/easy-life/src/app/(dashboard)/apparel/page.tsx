import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import {
  APPAREL_VENDOR,
  ensureRecordsSeeded,
  listApparelOrders,
  listApparelProducts,
} from "@/lib/server/records";
import { ApparelShop } from "@/components/apparel/apparel-shop";

export const dynamic = "force-dynamic";

export default async function ClubApparelPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  const communityId = session ? await resolveScopedCommunityId(session) : null;
  const [products, orders] = await Promise.all([
    listApparelProducts(communityId),
    listApparelOrders({ communityId }),
  ]);

  return (
    <ApparelShop
      mode="club"
      isAdmin
      headerTitle="Club Apparel"
      vendor={APPAREL_VENDOR}
      products={products.map((p) => ({
        id: p.id,
        vendorName: p.vendorName,
        name: p.name,
        description: p.description,
        price: p.price,
        sizes: JSON.parse(p.sizesJson) as string[],
        category: p.category,
        imageUrl: p.imageUrl,
      }))}
      orders={orders.map((o) => ({
        id: o.id,
        vendorName: o.vendorName,
        orderType: o.orderType,
        orderedByName: o.orderedByName,
        items: JSON.parse(o.itemsJson),
        total: o.total,
        notes: o.notes,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      }))}
    />
  );
}
