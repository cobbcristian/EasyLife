import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete Data — The Plaza at Oceanside",
  description:
    "Request deletion of personal data from The Plaza at Oceanside / Easy Life without closing your account.",
};

export default function DeleteDataPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Request data deletion</h1>
      <p className="mt-2 text-sm text-grey">
        For <strong className="text-ink">The Plaza at Oceanside</strong> (Easy
        Life), including the iOS and Android apps and the resident web portal.
        You can request deletion of some or all personal data{" "}
        <strong className="text-ink">without deleting your account</strong>.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-ink">How to request it</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-2">
          <li>
            Email{" "}
            <a
              href="mailto:support@easylife.com?subject=Plaza%20at%20Oceanside%20data%20deletion%20request"
              className="font-medium text-[var(--mvp-blue)]"
            >
              support@easylife.com
            </a>{" "}
            from the email address on your account.
          </li>
          <li>
            Use the subject line:{" "}
            <span className="font-medium text-ink">
              Plaza at Oceanside data deletion request
            </span>
            .
          </li>
          <li>
            Include your full name, unit number, and list which data you want
            removed (for example: profile photo, directory listing, messages,
            vehicles/pets, or “all personal data I can remove while keeping my
            login”).
          </li>
          <li>
            We will verify ownership and process the request within{" "}
            <strong className="text-ink">30 days</strong>.
          </li>
        </ol>
        <p className="text-sm leading-relaxed text-gray-2">
          While signed in, you can also edit or clear many profile fields
          yourself (photo, directory visibility, vehicles, pets, and similar).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-ink">What can be deleted</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-2">
          <li>Profile details and photos you uploaded</li>
          <li>Directory visibility / listed contact fields</li>
          <li>In-app messages and chat history tied to your account</li>
          <li>Optional profile data (vehicles, pets, preferences)</li>
          <li>Push notification tokens associated with your devices</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-ink">
          What may be kept (and for how long)
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-2">
          <li>
            <strong className="text-ink">Account credentials</strong> (email /
            login) if you choose to keep the account open.
          </li>
          <li>
            <strong className="text-ink">Financial / HOA payment records</strong>{" "}
            required for association accounting or processed via ClickPay —
            retained per legal/tax requirements.
          </li>
          <li>
            <strong className="text-ink">Security and access logs</strong> —
            typically up to about 6 months, then removed or anonymized.
          </li>
          <li>
            Aggregated / anonymized data that cannot identify you may be
            retained.
          </li>
        </ul>
      </section>

      <p className="mt-10 text-sm text-grey">
        To close the account entirely, see{" "}
        <Link
          href="/delete-account"
          className="font-medium text-[var(--mvp-blue)]"
        >
          Delete your account
        </Link>
        . Privacy details:{" "}
        <Link href="/privacy" className="font-medium text-[var(--mvp-blue)]">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
