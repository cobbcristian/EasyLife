import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete Account — The Plaza at Oceanside",
  description:
    "Request deletion of your The Plaza at Oceanside / Easy Life resident account and associated data.",
};

export default function DeleteAccountPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Delete your account</h1>
      <p className="mt-2 text-sm text-grey">
        For <strong className="text-ink">The Plaza at Oceanside</strong> (Easy
        Life), including the iOS and Android apps and the resident web portal.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-ink">How to request deletion</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-2">
          <li>
            Email{" "}
            <a
              href="mailto:support@easylife.com?subject=Plaza%20at%20Oceanside%20account%20deletion"
              className="font-medium text-[var(--mvp-blue)]"
            >
              support@easylife.com
            </a>{" "}
            from the email address on your account.
          </li>
          <li>
            Use the subject line:{" "}
            <span className="font-medium text-ink">
              Plaza at Oceanside account deletion
            </span>
            .
          </li>
          <li>
            Include your full name, unit number, and confirm you want the
            account deleted.
          </li>
          <li>
            We will verify ownership and process the request within{" "}
            <strong className="text-ink">30 days</strong> (usually sooner).
          </li>
        </ol>
        <p className="text-sm leading-relaxed text-gray-2">
          You can also ask property management in person or through the app&apos;s
          support channels using the same details.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-ink">What is deleted</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-2">
          <li>Account login (email/password) and profile details</li>
          <li>Directory visibility and personal profile fields you provided</li>
          <li>In-app messages and chat history tied to your account</li>
          <li>Amenity / service booking preferences stored on your profile</li>
          <li>App session tokens and push notification tokens</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-ink">
          What may be kept (and for how long)
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-2">
          <li>
            <strong className="text-ink">Financial / HOA payment records</strong>{" "}
            processed outside the app (e.g. ClickPay) or required for association
            accounting — retained per community legal/tax requirements (often
            several years).
          </li>
          <li>
            <strong className="text-ink">Security and access logs</strong> —
            typically up to about 6 months, then removed or anonymized.
          </li>
          <li>
            <strong className="text-ink">Aggregated / anonymized analytics</strong>{" "}
            that cannot identify you may be retained.
          </li>
          <li>
            Records we are legally required to keep for the HOA or regulators
            until that obligation ends.
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-ink">
          Delete some data without closing your account
        </h2>
        <p className="text-sm leading-relaxed text-gray-2">
          Yes. You can update or remove profile details (photo, directory
          visibility, vehicles, pets, etc.) while signed in. For deletion of
          specific data without closing the account, email{" "}
          <a
            href="mailto:support@easylife.com?subject=Plaza%20at%20Oceanside%20data%20deletion%20request"
            className="font-medium text-[var(--mvp-blue)]"
          >
            support@easylife.com
          </a>{" "}
          and describe what you want removed.
        </p>
      </section>

      <p className="mt-10 text-sm text-grey">
        See also our{" "}
        <Link href="/privacy" className="font-medium text-[var(--mvp-blue)]">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
