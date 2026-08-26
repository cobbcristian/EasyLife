import { prisma } from "@/lib/server/prisma";
import { ensureRecordsSeeded } from "@/lib/server/records";

export async function listInventory(communityId: string) {
  await ensureRecordsSeeded();
  return prisma.inventoryItem.findMany({
    where: { communityId, active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function createInventoryItem(input: {
  communityId: string;
  sku: string;
  name: string;
  category?: string;
  qtyOnHand?: number;
  reorderLevel?: number;
  unitCost?: number;
  location?: string;
}) {
  return prisma.inventoryItem.create({
    data: {
      communityId: input.communityId,
      sku: input.sku,
      name: input.name,
      category: input.category ?? "General",
      qtyOnHand: input.qtyOnHand ?? 0,
      reorderLevel: input.reorderLevel ?? 5,
      unitCost: input.unitCost ?? 0,
      location: input.location ?? "Pro Shop",
    },
  });
}

export async function adjustInventory(input: {
  itemId: string;
  type: "receive" | "sale" | "adjustment" | "transfer";
  qty: number;
  note?: string;
  createdBy: string;
}) {
  const item = await prisma.inventoryItem.findUnique({ where: { id: input.itemId } });
  if (!item) throw new Error("Item not found");

  const delta =
    input.type === "sale" ? -Math.abs(input.qty) : input.qty;
  const newQty = Math.max(0, item.qtyOnHand + delta);

  await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: input.itemId },
      data: { qtyOnHand: newQty },
    }),
    prisma.inventoryTransaction.create({
      data: {
        itemId: input.itemId,
        type: input.type,
        qty: input.qty,
        note: input.note ?? "",
        createdBy: input.createdBy,
      },
    }),
  ]);

  return { ...item, qtyOnHand: newQty };
}

export async function getLowStockItems(communityId: string) {
  const items = await listInventory(communityId);
  return items.filter((i) => i.qtyOnHand <= i.reorderLevel);
}
