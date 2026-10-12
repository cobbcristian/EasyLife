import { headers } from "next/headers";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { resolveDemoTenantFromCookieHeader } from "@/lib/tenant";

export default async function RegisterPendingPage() {
  const headerStore = await headers();
  const tenant = resolveDemoTenantFromCookieHeader(
    headerStore.get("host"),
    headerStore.get("cookie"),
  );
  const isOceanside = tenant?.communityId === "oceanside-residents";

  if (isOceanside && tenant) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f2f2f2] font-[family-name:var(--font-poppins)]">
        <header className="flex h-[72px] items-center bg-white px-6 shadow-sm sm:px-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tenant.logoSrc}
            alt={tenant.productName}
            className="h-11 w-auto max-w-[220px] object-contain"
          />
        </header>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-14 sm:py-20">
          <h1 className="text-[28px] font-bold uppercase tracking-wide text-[#1a1a1a] sm:text-[34px]">
            Sign-up Confirmation
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#6b6b6b]">
            Your registration info has been sent to the site administrator. You
            will not be able to log in until your registration is verified and
            approved. You will receive an email once your registration to the
            Plaza at Oceanside Community is approved. Thank you.
          </p>
          <Link
            href="/login"
            className="mt-10 inline-flex h-11 w-fit min-w-[140px] items-center justify-center rounded-md bg-[#1c3a4a] px-8 text-[15px] font-semibold text-white hover:bg-[#152c38]"
          >
            Continue
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-[family-name:var(--font-poppins)]">
      <header className="flex h-[72px] items-center border-b border-[#eee] px-8">
        <Logo size="md" />
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
          Registration received
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink">
          Pending approval
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-grey">
          Thanks for registering. Association management will review your unit
          and account. You will be able to sign in — and appear in the resident
          directory — after you are approved.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-[var(--mvp-blue)] px-5 text-sm font-semibold text-white"
        >
          Back to sign in
        </Link>
      </main>
    </div>
  );
}
