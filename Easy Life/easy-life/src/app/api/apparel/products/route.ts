import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { ensureRecordsSeeded, listApparelProducts } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();
  const communityId =
    session.role === "admin"
      ? await resolveScopedCommunityId(session)
      : session.communityId;
  const products = await listApparelProducts(communityId);
  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      vendorName: p.vendorName,
      name: p.name,
      description: p.description,
      price: p.price,
      sizes: JSON.parse(p.sizesJson) as string[],
      category: p.category,
      imageUrl: p.imageUrl,
    })),
  });
}
