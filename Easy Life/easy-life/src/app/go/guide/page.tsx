import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Easy Life | Community onboarding guide",
  },
  description:
    "Sales playbook for onboarding a new community after the sale — members, staff, and how to use the app.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon-192.png" }],
  },
};

const TOC = [
  { id: "after-sale", label: "After the sale" },
  { id: "stand-up", label: "Stand up the community" },
  { id: "members", label: "How members get on the app" },
  { id: "staff", label: "How employees get on the app" },
  { id: "use", label: "How to use the app by role" },
  { id: "demos", label: "Sales demos" },
  { id: "checklist", label: "Go-live checklist" },
] as const;

export default function SalesOnboardingGuidePage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] font-[family-name:var(--font-poppins)] text-ink">
      <header className="border-b border-[#e8ebf0] bg-white px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-grey">
              Easy Life · Sales
            </p>
            <Link
              href="/go"
              className="text-[13px] font-semibold text-[#007aff] hover:underline"
            >
              ← Demo clubs
            </Link>
          </div>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] md:text-[32px]">
            Community onboarding guide
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-grey">
            What happens after a club or HOA says yes — how we stand up their
            community, get members and staff into the app, and what each role
            uses day to day. Share this page with anyone on the sales team.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <nav
          aria-label="On this page"
          className="mb-10 rounded-2xl border border-[#e8ebf0] bg-white p-5 shadow-[0_10px_28px_rgba(16,24,40,0.04)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-grey">
            On this page
          </p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {TOC.map((item, i) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-[14px] font-medium text-[#007aff] hover:underline"
                >
                  {i + 1}. {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="space-y-12 text-[15px] leading-relaxed text-ink">
          <section id="after-sale" className="scroll-mt-8">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
              1. After the sale
            </h2>
            <p className="mt-3 text-grey">
              Closing the deal starts a short onboarding sprint. Easy Life
              (super admin) creates the community, hands credentials to the
              club&apos;s primary admin, then that admin (with PM/board help)
              loads branding, amenities, documents, and the member roster.
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-grey">
              <li>
                <span className="font-medium text-ink">Kickoff</span> — collect
                logo, brand color, admin contact, member roster format, and
                amenity list.
              </li>
              <li>
                <span className="font-medium text-ink">Create community</span> —
                Easy Life stands up the club and a temporary club-admin login.
              </li>
              <li>
                <span className="font-medium text-ink">Configure</span> —
                branding, invite code, amenities, documents, providers.
              </li>
              <li>
                <span className="font-medium text-ink">Invite people</span> —
                members self-join or CSV import; staff accounts created by
                admin.
              </li>
              <li>
                <span className="font-medium text-ink">Go live</span> — announce
                invite code, train front desk / PM, open member access.
              </li>
            </ol>
            <p className="mt-4 rounded-xl border border-[#e8ebf0] bg-white px-4 py-3 text-[14px] text-grey">
              Ops note: after login as club admin, the live checklist lives at{" "}
              <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                /communities/onboarding
              </code>
              .
            </p>
          </section>

          <section id="stand-up" className="scroll-mt-8">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
              2. Stand up the community
            </h2>
            <p className="mt-3 text-grey">
              Super admin creates the club under{" "}
              <strong className="font-semibold text-ink">
                Communities → Add Community
              </strong>{" "}
              (<code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                /communities/new
              </code>
              ). You enter club name, city/state, and the primary admin&apos;s
              name and email.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-grey">
              <li>
                System creates the community plus a unique{" "}
                <strong className="font-semibold text-ink">member invite code</strong>
                .
              </li>
              <li>
                Club admin gets a{" "}
                <strong className="font-semibold text-ink">
                  temporary password
                </strong>{" "}
                — share it securely and have them change it on first login.
              </li>
              <li>
                If email is configured, a welcome message can go out
                automatically; otherwise send credentials manually.
              </li>
              <li>
                Club admin then sets display name, logo, primary color, and
                cover under community settings.
              </li>
            </ul>
          </section>

          <section id="members" className="scroll-mt-8">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
              3. How members get on the app
            </h2>
            <p className="mt-3 text-grey">
              Members never need Easy Life staff to create every account. They
              join with the community invite code.
            </p>

            <h3 className="mt-6 text-[17px] font-semibold">
              Option A — Self-serve join (most common)
            </h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-grey">
              <li>
                Open{" "}
                <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                  /register
                </code>{" "}
                → choose <strong className="font-semibold text-ink">Join a club</strong>.
              </li>
              <li>Select their community and enter the invite code.</li>
              <li>
                Create email + password → land in the member portal
                (welcome / home).
              </li>
            </ol>
            <p className="mt-3 text-[14px] text-grey">
              Prefill link for email campaigns:{" "}
              <code className="break-all rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[12px] text-ink">
                /register?communityId=CLUB_ID&amp;code=INVITE_CODE&amp;email=member@email.com
              </code>
            </p>

            <h3 className="mt-6 text-[17px] font-semibold">
              Option B — Email invite from staff
            </h3>
            <p className="mt-2 text-grey">
              Admin, board, or PM sends invites from{" "}
              <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                /invites
              </code>
              ,{" "}
              <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                /pm/invites
              </code>
              , or{" "}
              <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                /board/invites
              </code>
              . The member gets a join link with the code already filled in.
            </p>

            <h3 className="mt-6 text-[17px] font-semibold">
              Option C — Bulk CSV import
            </h3>
            <p className="mt-2 text-grey">
              For a full roster at launch, club admin uploads CSV (
              <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[12px] text-ink">
                name, email, unit, phone
              </code>
              ) from the onboarding checklist. Each new member gets a temporary
              password — download the credentials file and distribute securely,
              or tell members to reset / self-join with the invite code.
            </p>

            <p className="mt-4 rounded-xl border border-[#e8ebf0] bg-white px-4 py-3 text-[14px] text-grey">
              Mobile apps use the same join flow with invite code. Providers
              (tennis pros, landscapers, etc.) use{" "}
              <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                /signup
              </code>
              — that is not the member path.
            </p>
          </section>

          <section id="staff" className="scroll-mt-8">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
              4. How employees get on the app
            </h2>
            <p className="mt-3 text-grey">
              Board, property managers, and club admins are{" "}
              <strong className="font-semibold text-ink">not</strong> self-signup.
              A club admin (or Easy Life super admin) creates them under{" "}
              <strong className="font-semibold text-ink">Users</strong> (
              <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                /users
              </code>
              ).
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#e8ebf0] bg-white">
              <table className="w-full text-left text-[14px]">
                <thead className="border-b border-[#eceff3] bg-[#fafbfc] text-[12px] uppercase tracking-wide text-grey">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Who</th>
                    <th className="px-4 py-3 font-semibold">How they get in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eceff3] text-grey">
                  <tr>
                    <td className="px-4 py-3 font-medium text-ink">Admin</td>
                    <td className="px-4 py-3">Club operator / GM</td>
                    <td className="px-4 py-3">
                      Created at community setup, or added in Users
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-ink">PM</td>
                    <td className="px-4 py-3">Property / HOA manager</td>
                    <td className="px-4 py-3">Admin adds role = PM in Users</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-ink">Board</td>
                    <td className="px-4 py-3">Board members</td>
                    <td className="px-4 py-3">
                      Admin adds role = Board in Users
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-ink">Member</td>
                    <td className="px-4 py-3">Residents / club members</td>
                    <td className="px-4 py-3">
                      Invite code join, email invite, or CSV
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-ink">Provider</td>
                    <td className="px-4 py-3">Pros &amp; local vendors</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-[#f2f4f7] px-1 font-mono text-[12px] text-ink">
                        /signup
                      </code>{" "}
                      or admin creates provider user
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-grey">
              Share each person&apos;s email + temporary password, then have
              them sign in at{" "}
              <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                /login
              </code>{" "}
              and change the password. Front desk / pro shop staff who only need
              ops tools are usually given a{" "}
              <strong className="font-semibold text-ink">PM</strong> account.
            </p>
          </section>

          <section id="use" className="scroll-mt-8">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
              5. How to use the app by role
            </h2>
            <p className="mt-3 text-grey">
              Use this as a talking script when walking a buyer through the
              product.
            </p>

            <h3 className="mt-6 text-[17px] font-semibold">Members</h3>
            <p className="mt-2 text-grey">
              Home portal at{" "}
              <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                /member
              </code>
              . Typical first-week actions:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-grey">
              <li>Book amenities, courts, spa / clubhouse (Book)</li>
              <li>See events and RSVP (Calendar)</li>
              <li>Dining reservations and grab-and-go orders</li>
              <li>Pay dues / balances (Payments)</li>
              <li>Messages, documents, directory, household, profile</li>
              <li>Service requests, vendors, marketplace, newsletter</li>
            </ul>

            <h3 className="mt-6 text-[17px] font-semibold">
              Property manager / staff
            </h3>
            <p className="mt-2 text-grey">
              Ops portal at{" "}
              <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                /pm
              </code>
              :
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-grey">
              <li>Front desk / guest check-in</li>
              <li>Vehicle &amp; pet registrations</li>
              <li>Maintenance and service requests</li>
              <li>Member invites, documents, invoices / guest fees</li>
              <li>Events, dining oversight, reports, board messages</li>
            </ul>

            <h3 className="mt-6 text-[17px] font-semibold">Board</h3>
            <p className="mt-2 text-grey">
              Governance portal at{" "}
              <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                /board
              </code>
              : scheduler, votes / surveys / bids, budget &amp; reserves,
              documents, announcements, private board messages, invoices for
              review.
            </p>

            <h3 className="mt-6 text-[17px] font-semibold">Club admin</h3>
            <p className="mt-2 text-grey">
              Platform tools for that club: communities &amp; branding, users &amp;
              roles, invites, amenities, services &amp; activities, notifications /
              templates, app setup, help desk.
            </p>

            <h3 className="mt-6 text-[17px] font-semibold">Providers</h3>
            <p className="mt-2 text-grey">
              Provider portal at{" "}
              <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                /provider
              </code>
              : calendar, bookings, promotions, account / payouts (Stripe
              Connect when paid services go live).
            </p>
          </section>

          <section id="demos" className="scroll-mt-8">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
              6. Sales demos
            </h2>
            <p className="mt-3 text-grey">
              Before or after the sale, run live demos from the sales directory:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-grey">
              <li>
                Open{" "}
                <Link href="/go" className="font-semibold text-[#007aff] hover:underline">
                  /go
                </Link>{" "}
                and pick a club — that locks logo and branding on login.
              </li>
              <li>
                Direct links look like{" "}
                <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                  /go/spanishwells
                </code>
                ,{" "}
                <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5 font-mono text-[13px] text-ink">
                  /go/harborpointe
                </code>
                , etc. Each salesperson can demo a different club the same day.
              </li>
              <li>
                Demo password for sales-ready clubs is{" "}
                <strong className="font-semibold text-ink">password</strong>. Use
                Member / Board / PM quick buttons for role walkthroughs.
              </li>
            </ul>
          </section>

          <section id="checklist" className="scroll-mt-8">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
              7. Go-live checklist
            </h2>
            <ul className="mt-4 space-y-3">
              {[
                "Community created; admin password + invite code shared securely",
                "Logo, display name, and primary color set",
                "Amenities added and a test booking completed",
                "Key documents uploaded (bylaws, rules, welcome packet)",
                "PM and board accounts created; each person can log in",
                "Member roster invited or CSV-imported",
                "Rollout email sent with join link + invite code",
                "Front desk briefed on password resets and first login",
                "Payments smoke-tested (dues or a small checkout)",
                "Optional: POS / MICROS ticket filed via Help Desk if needed",
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-xl border border-[#e8ebf0] bg-white px-4 py-3 text-[14px] text-grey"
                >
                  <span
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border border-[#c5ccd6]"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[14px] text-grey">
              Questions during a live deal? Use the Help Desk in-app or ping the
              Easy Life ops contact listed on the sales handoff sheet.
            </p>
          </section>
        </article>

        <footer className="mt-14 border-t border-[#e8ebf0] pt-6 pb-10 text-center text-[13px] text-grey">
          <Link href="/go" className="font-semibold text-[#007aff] hover:underline">
            Back to demo clubs
          </Link>
          <span className="mx-2 text-[#c5ccd6]">·</span>
          <span>Easy Life sales onboarding</span>
        </footer>
      </main>
    </div>
  );
}
