import Link from "next/link";
import { getSession } from "@/lib/server/auth";
import { getCommunityById } from "@/lib/server/db";
import { tServer } from "@/lib/server/i18n";
import { brandAssets } from "@/lib/brand-assets";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MemberWelcomePage() {
  const session = await getSession();
  if (!session || session.role !== "member") redirect("/login");

  const community =
    session.communityId != null ? await getCommunityById(session.communityId) : null;
  const name = community?.appDisplayName ?? community?.name ?? "your community";

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
            {await tServer("Member")}
          </p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {await tServer("Welcome")}
          </h1>
        </header>

        <div className="overflow-hidden px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandAssets.onboardingHero}
            alt=""
            className="h-44 w-full rounded-2xl object-cover"
          />
          <div className="px-1 pt-5 text-center">
            <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
              {await tServer("Welcome to your community")}
            </h2>
            <p className="mt-2 text-sm text-grey">
              {await tServer("You are now a member of")}{" "}
              <span className="font-semibold text-ink">{name}</span>.
            </p>
            <p className="mt-1 text-[12px] text-grey">
              {await tServer("Book amenities, view announcements, and more.")}
            </p>
            <Link
              href="/member"
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white"
            >
              {await tServer("Go to member portal")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
