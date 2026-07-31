import { getSession } from "@/lib/server/auth";
import { getRentalFlexAvailability, listRentalsForMember } from "@/lib/server/records";
import { IRON_LAKE_COMMUNITY_ID } from "@/lib/iron-lake-tiers";
import {
  IRON_LAKE_REPLACED_RENTAL_IDS,
  ironLakeEquipmentRentals,
  ironLakeGolfClubRentals,
  ironLakeTowerLodging,
  rentalItems,
} from "@/lib/member-data";
import { IRON_LAKE_GOLF_CLUBS_ITEM_ID, todayIsoDate } from "@/lib/rental-flex";
import { isFourClubDemoId } from "@/lib/server/four-club-demo-content";
import { RentalsClient, type FlexAvailabilityDTO } from "./rentals-client";

export const dynamic = "force-dynamic";

export default async function MemberRentalsPage() {
  const session = await getSession();
  const rows = session ? await listRentalsForMember(session.email) : [];
  const initial = rows.map((r) => ({
    id: r.id,
    item: r.item,
    days: r.days,
    total: r.total,
    status: r.status,
    flex: r.flex,
    startDate: r.startDate,
    endDate: r.endDate,
  }));

  const isIronLake = session?.communityId === IRON_LAKE_COMMUNITY_ID;
  const isHoaDemo =
    isFourClubDemoId(session?.communityId) && session?.communityId !== "spanish-wells";
  const catalog = isIronLake
    ? [
        ...ironLakeTowerLodging,
        ...ironLakeEquipmentRentals,
        ...ironLakeGolfClubRentals,
        ...rentalItems.filter((i) => !IRON_LAKE_REPLACED_RENTAL_IDS.has(i.id)),
      ]
    : isHoaDemo
      ? rentalItems.filter((i) => i.category !== "Golf")
      : rentalItems;

  let initialFlexAvailability: FlexAvailabilityDTO[] | null = null;
  if (isIronLake && session) {
    initialFlexAvailability = await getRentalFlexAvailability({
      communityId: session.communityId,
      itemId: IRON_LAKE_GOLF_CLUBS_ITEM_ID,
      startDate: todayIsoDate(),
      days: 1,
    });
  }

  return (
    <RentalsClient
      initial={initial}
      avatarName={session?.name ?? "Member"}
      rentalItems={catalog}
      initialFlexAvailability={initialFlexAvailability}
      pageTitle={isIronLake ? "Tower Lodging & Rentals" : "Equipment Rental"}
      pageSubtitle={
        isIronLake
          ? "Tower lodging, event space, tennis ball machine, and IronCrest golf club sets by shaft flex."
          : undefined
      }
    />
  );
}
