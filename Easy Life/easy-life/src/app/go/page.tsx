import type { Metadata } from "next";
import Link from "next/link";
import { listSalesReadyTenants } from "@/lib/tenant";
import { GoSalesClient } from "./go-sales-client";

export const dynamic = "force-dynamic";

/** Ignore locked demo-tenant cookies — this page is Easy Life sales, not one club. */
export const metadata: Metadata = {
  title: {
    absolute: "Easy Life | Sales demos",
  },
  description:
    "Easy Life sales directory — open a club demo and copy logins.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon-192.png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Easy Life",
  },
};

/** Internal sales directory — pick a club demo without memorizing URLs. */
export default function GoSalesIndexPage() {
  const tenants = listSalesReadyTenants()
    .sort((a, b) => a.communityName.localeCompare(b.communityName))
    .map((t) => ({
      id: t.id,
      communityName: t.communityName,
      defaultLoginEmail: t.defaultLoginEmail,
      logoSrc: t.logoSrc,
    }));

  return (
    <div className="min-h-screen bg-[#f7f8fa] font-[family-name:var(--font-poppins)] text-ink">
      <header className="border-b border-[#e8ebf0] bg-white px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-grey">
              Easy Life · Sales
            </p>
            <Link
              href="/go/guide"
              className="text-[13px] font-semibold text-[#007aff] hover:underline"
            >
              Onboarding guide →
            </Link>
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.02em]">
            Demo clubs
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] text-grey">
            Open a club link to lock branding on login. Demo password for all
            clubs below is{" "}
            <span className="font-semibold text-ink">password</span>. Use{" "}
            <span className="font-semibold text-ink">Demo logins</span> for
            member / board / PM emails. After a sale closes, see the{" "}
            <Link href="/go/guide" className="font-semibold text-[#007aff] hover:underline">
              community onboarding guide
            </Link>
            .
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <div className="overflow-hidden rounded-2xl border border-[#002856]/20 bg-white shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#002856]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/logo-icon.png"
                  alt=""
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-grey">
                  Platform master
                </p>
                <p className="truncate text-[15px] font-semibold">
                  Super Admin
                </p>
                <p className="truncate font-mono text-[12px] text-grey">
                  superadmin@gmail.com
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-grey">
                  /go/superadmin
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href="/go/superadmin"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#002856] px-4 text-[14px] font-medium text-white hover:opacity-95"
              >
                Open Super Admin
              </Link>
            </div>
          </div>
        </div>

        <GoSalesClient tenants={tenants} />
        <p className="text-center text-[12px] text-grey">
          {tenants.length} demo clubs
        </p>
      </main>
    </div>
  );
}
