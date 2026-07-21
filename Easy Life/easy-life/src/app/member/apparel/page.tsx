import { getSession } from "@/lib/server/auth";
import {
  APPAREL_VENDOR,
  ensureRecordsSeeded,
  listApparelOrders,
  listApparelProducts,
} from "@/lib/server/records";
import { ApparelShop } from "@/components/apparel/apparel-shop";
import { memberProfile } from "@/lib/member-data";

export const dynamic = "force-dynamic";

export default async function MemberApparelPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  const communityId = session?.communityId;
  const [products, orders] = await Promise.all([
    listApparelProducts(communityId),
    session
      ? listApparelOrders({ communityId, orderedByEmail: session.email })
      : Promise.resolve([]),
  ]);

  return (
    <ApparelShop
      mode="member"
      headerTitle="Club Apparel"
      avatarName={memberProfile.name}
      vendor={products[0]?.vendorName ?? APPAREL_VENDOR}
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
