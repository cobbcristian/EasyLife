import { diningProviderEmail } from "@/lib/server/dining";
import {
  priceDiningCart,
  type DiningCartLineInput,
} from "@/lib/dining-pricing";
import { listMenuItems } from "@/lib/server/records";

/** Load club menu and price a cart server-side. */
export async function priceDiningOrderForCommunity(input: {
  communityId?: string | null;
  items: DiningCartLineInput[];
  fulfillment?: string | null;
}) {
  const providerEmail = diningProviderEmail(input.communityId);
  if (!providerEmail) {
    return { ok: false as const, error: "Dining is not available for this club" };
  }
  const menu = await listMenuItems(providerEmail);
  return priceDiningCart({
    menu: menu.map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      available: m.available,
    })),
    items: input.items,
    fulfillment: input.fulfillment,
  });
}
