import Link from "next/link";
import { getSession } from "@/lib/server/auth";
import {
  communityHasClubDining,
  communityHasClubResignRejoin,
  communityHasFbMinimum,
  communityIsResidentialHoa,
} from "@/lib/community-features";
import { IRON_LAKE_COMMUNITY_ID } from "@/lib/iron-lake-tiers";
import {
  normalizeMembershipTier,
  resolveTierDefinition,
  type AmenityAccessKind,
} from "@/lib/membership-tiers";
import { prisma } from "@/lib/server/prisma";
import { MembershipClient } from "./membership-client";
import { IronLakeMembershipPlan } from "@/components/member/iron-lake-membership-plan";

export const dynamic = "force-dynamic";

const ACCESS_LABELS: Record<AmenityAccessKind, string> = {
  court: "Tennis courts",
  golf_course: "Golf course",
  driving_range: "Practice facility",
  gym: "Fitness center",
  facility: "Community facilities",
  dining: "Dining",
  spa: "Spa",
  store: "Club apparel / shop",
};

export default async function MemberMembershipPage() {
  const session = await getSession();
  const isIronLake = session?.communityId === IRON_LAKE_COMMUNITY_ID;
  const communityId = session?.communityId ?? undefined;
  const isCondo = communityIsResidentialHoa(communityId);
  const showResignRejoin = communityHasClubResignRejoin(communityId);
  const hasDining = communityHasClubDining(communityId);
  const hasFb = communityHasFbMinimum(communityId);

  let tierSlug: string | null = null;
  if (session?.email) {
    const profile = await prisma.memberProfileExt.findUnique({
      where: { userEmail: session.email.toLowerCase() },
      select: { membershipTier: true },
    });
    tierSlug = profile?.membershipTier ?? null;
  }

  if (!isIronLake) {
    const slug = normalizeMembershipTier(tierSlug);
    const def = resolveTierDefinition(slug, communityId);
    const periodLabel =
      def.fbMinimumPeriod === "monthly"
        ? "month"
        : def.fbMinimumPeriod === "quarterly"
          ? "quarter"
          : def.fbMinimumPeriod === "semi_annual"
            ? "six months"
            : "year";
    const accessKinds = def.accessKinds.filter((kind) => {
      if (!hasDining && (kind === "dining" || kind === "spa" || kind === "store")) {
        return false;
      }
      return true;
    });

    return (
      <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink">
        <div className="mx-auto w-full max-w-lg px-4 py-6 md:max-w-2xl md:px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
            {isCondo ? "Community" : "Member"}
          </p>
          <h1 className="text-[22px] font-semibold md:text-[26px]">
            {isCondo ? "Your access" : "Membership"}
          </h1>
          <p className="mt-1 text-sm text-grey">
            {isCondo
              ? "Your building access and community account."
              : "Your plan, privileges, and account actions."}
          </p>

          <section className="mt-6 rounded-2xl border border-[#e8ebf0] px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-grey">
              {isCondo ? "Your community" : "Your plan"}
            </p>
            <h2 className="mt-1 text-[20px] font-semibold">
              {isCondo ? "Oceanside Residents" : def.name}
            </h2>
            {!isCondo || hasFb ? (
              <p className="mt-2 text-sm text-grey">
                {def.fbMinimumAmount <= 0
                  ? "No F&B minimum"
                  : `F&B minimum $${def.fbMinimumAmount.toFixed(0)} / ${periodLabel}`}
              </p>
            ) : null}
            <ul className="mt-4 space-y-2">
              {accessKinds.map((kind) => (
                <li key={kind} className="flex items-start gap-2 text-sm text-ink">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--mvp-blue)]"
                    aria-hidden
                  />
                  {ACCESS_LABELS[kind]}
                </li>
              ))}
              {isCondo ? (
                <li className="flex items-start gap-2 text-sm text-ink">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--mvp-blue)]"
                    aria-hidden
                  />
                  Building amenities &amp; community services
                </li>
              ) : null}
            </ul>
            <Link
              href="/member/contact"
              className="mt-5 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
            >
              {isCondo ? "Contact management" : "Contact membership"}
            </Link>
          </section>

          {showResignRejoin ? (
            <div className="mt-10 border-t border-[#eceff3] pt-8">
              <h2 className="text-[18px] font-semibold">Account actions</h2>
              <p className="mt-1 text-sm text-grey">
                Resign or rejoin policies for your membership account.
              </p>
              <div className="mt-4">
                <MembershipClient embedded />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
          The Club at Iron Lake
        </p>
        <h1 className="text-[22px] font-semibold md:text-[26px]">
          Membership Plan, Services & Charges
        </h1>
        <p className="mt-1 text-sm text-grey">
          Official schedule of initiation fees, dues, F&B minimums, and member
          services — rates as of May, 2026.
        </p>

        <div className="mt-6">
          <IronLakeMembershipPlan currentTierSlug={tierSlug} />
        </div>

        <div className="mt-10 border-t border-[#eceff3] pt-8">
          <h2 className="text-[18px] font-semibold">Account actions</h2>
          <p className="mt-1 text-sm text-grey">
            Resign or rejoin policies for your membership account.
          </p>
          <div className="mt-4">
            <MembershipClient embedded />
          </div>
        </div>
      </div>
    </div>
  );
}
