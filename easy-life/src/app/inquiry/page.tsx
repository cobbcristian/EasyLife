import type { Metadata } from "next";
import { InquiryForm } from "./inquiry-form";

export const metadata: Metadata = {
  title: "Request a demo | Easy Life",
  description:
    "Request an Easy Life demo for your HOA, condo, or private club. Cobb Enterprise will follow up.",
  robots: { index: true, follow: true },
};

export default function InquiryPage() {
  return (
    <div className="min-h-screen bg-[#f6f1e8] text-[#0b1f1c]">
      <header className="border-b border-black/10 bg-[#0b1f1c] px-5 py-8 text-[#f6f1e8] sm:px-8">
        <div className="mx-auto max-w-lg">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
            Cobb Enterprise · Easy Life
          </p>
          <h1 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.03em] sm:text-[2.35rem]">
            Request a demo
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed opacity-80">
            Tell us about your community. We’ll reach out to show Easy Life —
            bookings, payments, packages, and desk messaging in one branded app.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-8 sm:px-8">
        <InquiryForm />
        <p className="mt-8 text-center text-xs text-[#5c6b66]">
          Prefer email?{" "}
          <a
            href="mailto:cobbcristian17@gmail.com?subject=Easy%20Life%20demo%20request"
            className="font-semibold text-[#b84a2f] underline-offset-2 hover:underline"
          >
            cobbcristian17@gmail.com
          </a>
        </p>
      </main>
    </div>
  );
}
