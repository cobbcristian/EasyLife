const sections = [
  {
    h: "1. Acceptance of Terms",
    p: "By accessing or using the Easy Life community platform, you agree to be bound by these Terms of Service and all applicable community rules and bylaws.",
  },
  {
    h: "2. Accounts & Eligibility",
    p: "Accounts are provided to verified residents, board members, property managers, service providers, and administrators of participating communities. You are responsible for safeguarding your credentials and for all activity under your account.",
  },
  {
    h: "3. Payments & Dues",
    p: "HOA dues, amenity fees, and service payments are processed through our payment provider. You authorize Easy Life to facilitate these charges. Refunds are governed by your community's policies.",
  },
  {
    h: "4. Bookings & Amenities",
    p: "Amenity reservations are subject to availability, posted schedules, and community usage rules. Repeated no-shows or violations may result in suspension of booking privileges.",
  },
  {
    h: "5. Acceptable Use",
    p: "You agree not to misuse the platform, post unlawful content, harass other residents, or attempt to access areas you are not authorized to use.",
  },
  {
    h: "6. Limitation of Liability",
    p: "Easy Life provides the platform 'as is.' We are not liable for disputes between residents, providers, or communities, or for amenity or service outcomes.",
  },
  {
    h: "7. Changes to These Terms",
    p: "We may update these Terms from time to time. Continued use after changes constitutes acceptance of the revised Terms.",
  },
];

export default function TermsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Terms of Service</h1>
      <p className="mt-2 text-sm text-grey">Last updated June 24, 2026</p>
      <div className="mt-8 space-y-6">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-semibold text-ink">{s.h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-2">{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
