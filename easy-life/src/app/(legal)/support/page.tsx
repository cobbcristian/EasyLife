import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support | The Plaza at Oceanside",
  description:
    "Help and support for The Plaza at Oceanside app and Easy Life community platform.",
};

export default function SupportPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Support</h1>
      <p className="mt-2 text-sm text-grey">
        The Plaza at Oceanside · Easy Life
      </p>

      <p className="mt-6 text-sm leading-relaxed text-gray-2">
        Need help with the mobile app or your community account? Reach us using
        the options below. We typically respond within 1–2 business days.
      </p>

      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-semibold text-ink">Email support</h2>
        <p className="text-sm leading-relaxed text-gray-2">
          <a
            href="mailto:cobbcristian17@gmail.com?subject=Plaza%20Oceanside%20App%20Support"
            className="font-medium text-[var(--mvp-blue)] hover:underline"
          >
            cobbcristian17@gmail.com
          </a>
        </p>
        <p className="text-sm leading-relaxed text-gray-2">
          Include your name, unit (if applicable), and a short description of
          the issue. Screenshots help for login or booking problems.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-semibold text-ink">In the app</h2>
        <p className="text-sm leading-relaxed text-gray-2">
          Signed-in residents can use{" "}
          <span className="font-medium text-ink">Messages</span> to contact
          community management, or open{" "}
          <span className="font-medium text-ink">Assistant</span> for common
          tasks (bookings, HOA dues, local Pros).
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-semibold text-ink">Web access</h2>
        <p className="text-sm leading-relaxed text-gray-2">
          You can also sign in on the web:{" "}
          <a
            href="https://easylife-plaza-app.azurewebsites.net/go/oceansideresidents"
            className="font-medium text-[var(--mvp-blue)] hover:underline"
          >
            easylife-plaza-app.azurewebsites.net
          </a>
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-semibold text-ink">Policies</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-gray-2">
          <li>
            <Link
              href="/privacy"
              className="font-medium text-[var(--mvp-blue)] hover:underline"
            >
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link
              href="/terms"
              className="font-medium text-[var(--mvp-blue)] hover:underline"
            >
              Terms of Use
            </Link>
          </li>
          <li>
            <Link
              href="/delete-account"
              className="font-medium text-[var(--mvp-blue)] hover:underline"
            >
              Delete account
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
