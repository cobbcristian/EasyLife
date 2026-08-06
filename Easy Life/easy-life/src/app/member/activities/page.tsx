import Link from "next/link";
import { redirect } from "next/navigation";
import { imageForAmenity } from "@/lib/brand-assets";
import { isBookableAmenityKind } from "@/lib/member-dtos";
import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, listAmenities } from "@/lib/server/records";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MemberActivitiesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await ensureRecordsSeeded();
  const amenities = (await listAmenities(session.communityId)).filter((a) =>
    isBookableAmenityKind(a.kind),
  );

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink">
      <div className="mx-auto max-w-lg px-4 pb-28 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
          Member
        </p>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Fun Stuff</h1>
        <p className="mt-1 text-sm text-grey">
          Courts, spa, and partner activities — tap for details, then reserve.
        </p>
        {amenities.length === 0 ? (
          <div className="mt-8 rounded-xl bg-[#F7F8FA] p-5 text-center">
            <p className="text-sm font-semibold text-ink">Nothing listed yet.</p>
            <Link
              href="/member/bookings"
              className="mt-3 inline-flex text-sm font-semibold text-[var(--mvp-blue)]"
            >
              Book a court or amenity →
            </Link>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {amenities.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/member/amenities/${a.id}`}
                  className="flex gap-3 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageForAmenity(a.kind, a.name)}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{a.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-grey">
                      {a.description || a.schedule || a.kind}
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-[var(--mvp-blue)]">
                      {a.fee > 0 ? formatCurrency(a.fee) : "Included"}
                      {!a.playable ? " · Unavailable" : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/member/bookings"
          className="mt-6 flex h-12 items-center justify-center rounded-xl bg-[var(--mvp-blue)] text-sm font-semibold text-white"
        >
          Quick reserve
        </Link>
      </div>
    </div>
  );
}
