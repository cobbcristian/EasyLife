import { MemberMvpDining } from "@/components/member/member-mvp-dining";
import { getSession } from "@/lib/server/auth";
import {
  ensureRecordsSeeded,
  listAmenities,
  listMenuItems,
  listOrdersForMember,
} from "@/lib/server/records";
import { diningProviderEmail } from "@/lib/server/dining";

export const dynamic = "force-dynamic";

function shortCuisine(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) return "Club Dining";
  const firstSentence = trimmed.split(/[.!?]/)[0]?.trim() ?? trimmed;
  return firstSentence.length > 48 ? `${firstSentence.slice(0, 45)}…` : firstSentence;
}

export default async function MemberDiningPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  const providerEmail = diningProviderEmail(session?.communityId);
  const [menuRows, orderRows, amenities] = await Promise.all([
    listMenuItems(providerEmail),
    session ? listOrdersForMember(session.email) : Promise.resolve([]),
    listAmenities(session?.communityId),
  ]);

  const restaurantAmenities = amenities.filter((a) => a.kind === "restaurant");
      const restaurants =
    restaurantAmenities.length > 0
      ? restaurantAmenities.map((a) => ({
          id: a.id,
          name: a.name,
          cuisine:
            a.name === "The Cabana"
              ? "Poolside · Lunch Tue–Sun · Dinner Sat–Sun"
              : a.name === "The Grille Room"
                ? "Dinner Tue–Fri · Country Club Casual"
                : a.name.toLowerCase().includes("clubhouse")
                  ? "American · Club Dining"
                  : a.schedule || shortCuisine(a.description),
        }))
      : [
          // Empty beats leaking Golden Ocala restaurant names into other clubs.
        ];

  return (
    <MemberMvpDining
      restaurants={restaurants}
      menuItems={menuRows.map((m) => ({
        id: m.id,
        name: m.name,
        price: m.price,
        category: m.category,
      }))}
      initialOrders={orderRows.map((o) => ({
        id: o.id,
        items: o.items,
        total: o.total,
        fulfillment: o.fulfillment,
        status: o.status,
        createdAt: o.createdAt.toISOString().slice(0, 10),
        restaurant: o.restaurant,
        arriveDate: o.arriveDate,
        arriveTime: o.arriveTime,
        partySize: o.partySize,
        tableLabel: o.tableLabel,
        readyBy: o.readyBy,
      }))}
    />
  );
}
