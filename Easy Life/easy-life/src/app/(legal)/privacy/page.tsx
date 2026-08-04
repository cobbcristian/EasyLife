const sections = [
  {
    h: "1. Information We Collect",
    p: "We collect account details (name, email, phone, unit), profile data you provide (vehicles, pets, photos), payment information processed by our payment provider, and usage activity within the platform.",
  },
  {
    h: "2. How We Use Information",
    p: "To operate community features (bookings, directory, payments, messaging), to send notifications you opt into, to maintain access logs for security, and to improve the service.",
  },
  {
    h: "3. Directory Visibility",
    p: "You control whether your profile appears in the resident directory. You can opt in or out at any time from your profile settings.",
  },
  {
    h: "4. Sharing",
    p: "We share information only as needed to operate the platform — for example, with your community's management, approved service providers for bookings you make, and payment processors. We do not sell personal data.",
  },
  {
    h: "5. Data Retention",
    p: "Access logs and activity history are retained per your community's regulatory requirements (typically up to 6 months for activity, longer for financial records).",
  },
  {
    h: "6. Your Rights",
    p: "You may request access to, correction of, or deletion of your personal data, subject to legal and community record-keeping obligations.",
  },
  {
    h: "7. Contact",
    p: "For privacy questions, contact your community administrator or privacy@easylife.com. The Plaza at Oceanside mobile apps use the same Easy Life platform and this policy.",
  },
];

export default function PrivacyPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Privacy Policy</h1>
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
