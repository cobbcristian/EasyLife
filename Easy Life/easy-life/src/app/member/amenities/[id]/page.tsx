import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MemberMvpServiceDetails } from "@/components/member/member-mvp-service-details";
import { imageForAmenity } from "@/lib/brand-assets";
import { figmaDetailForAmenity } from "@/lib/figma-service-detail";
import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, listAmenities } from "@/lib/server/records";

export const dynamic = "force-dynamic";

export default async function MemberAmenityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  await ensureRecordsSeeded();
  const { id } = await params;
  const amenities = await listAmenities(session.communityId);
  const amenity = amenities.find((a) => a.id === id);
  if (!amenity) notFound();

  const detail = figmaDetailForAmenity(amenity);
  detail.heroImage = imageForAmenity(amenity.kind, amenity.name);

  return (
    <div className="min-h-screen bg-white">
      <MemberMvpServiceDetails
        detail={detail}
        bookHref={`/member/bookings?amenity=${encodeURIComponent(amenity.id)}`}
        bookLabel="Reserve"
      />
      <p className="mx-auto max-w-lg px-4 pb-8 text-center text-[12px] text-grey">
        <Link href="/member/activities" className="font-semibold text-[var(--mvp-blue)]">
          All Fun Stuff
        </Link>
      </p>
    </div>
  );
}
