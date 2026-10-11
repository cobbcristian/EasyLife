const UPDATED = "October 11, 2026";

const sections = [
  {
    h: "1. Who We Are",
    p: [
      "This app is operated by Barnaby, LLC, a Florida limited liability company (\"Barnaby,\" \"we,\" \"us\"). Barnaby was formerly called Easy Life. The Plaza at Oceanside mobile apps run on the same platform and are covered by this policy.",
      "Your community (for example, your HOA or property manager) controls its residents' records. We process those records to provide the service to your community.",
    ],
  },
  {
    h: "2. Information We Collect",
    p: [
      "Account details: name, email, phone, unit, and role (member, board, property manager, provider, or admin).",
      "Profile details you choose to add, such as vehicles, pets, and photos.",
      "Activity in the app: bookings and reservations, service requests, messages, calendar items, and community alerts.",
      "Conversations with Barnaby, our AI assistant (see section 4).",
      "Resident desk records your community keeps, such as parking passes, incident reports, and insurance documents.",
      "For service providers: business details and documents you upload, such as licenses, insurance, and background check results.",
      "Payment information, which is collected and processed by our payment processor. We do not store full card numbers.",
      "Device information needed for push notifications, plus security logs and error reports.",
    ],
  },
  {
    h: "3. How We Use Information",
    p: [
      "To run community features (bookings, directory, payments, messaging, calendar, marketplace), to send service notifications, to keep the platform secure, to fix errors, and to improve the service. We do not sell personal data.",
    ],
  },
  {
    h: "4. Barnaby, Our AI Assistant",
    p: [
      "The app includes Barnaby, an artificial intelligence (AI) assistant. Barnaby is software, not a person, and its voice is computer-generated.",
      "When you send a request to Barnaby, the text of your message and the information needed to answer it (for example, your community and the amenities you can book) is sent to our AI service provider, OpenAI, to generate a reply. When Barnaby reads a reply aloud, the reply text is sent to OpenAI to generate the voice.",
      "OpenAI processes this information on our behalf. Under OpenAI's business terms, it is not used to train OpenAI's models unless we opt in, and we have not. OpenAI may keep it for a limited time (currently up to 30 days) for abuse monitoring.",
      "Barnaby can make mistakes. Barnaby asks you to confirm before completing a booking. Do not use Barnaby for emergencies. For help from a person, contact your property manager or use in-app messages.",
      "Please do not share sensitive information with Barnaby, such as Social Security numbers, bank or card numbers, or health information.",
    ],
  },
  {
    h: "5. Directory Visibility",
    p: [
      "You control whether your profile appears in the resident directory. You can opt in or out at any time from your profile settings.",
    ],
  },
  {
    h: "6. Who We Share Information With",
    p: [
      "Your community's management and administrators; service providers you book; and companies that help us run the service: Microsoft Azure (hosting, database, and file storage), OpenAI (AI assistant), Stripe (payments), Resend (email), Apple and Expo (push notifications), and Sentry (error reporting). These companies may use the information only to provide services to us.",
      "We may also share information when the law requires it, or to protect the safety of residents or the platform.",
    ],
  },
  {
    h: "7. Notifications and Email",
    p: [
      "We send account and service messages, such as password resets and booking notices. You can turn off push notifications in your device settings. If we send marketing email, you can unsubscribe using the link in that email. The app does not send text messages today. If that changes, we will ask for your consent first.",
    ],
  },
  {
    h: "8. How Long We Keep Information",
    p: [
      "We keep your account information and Barnaby conversations while your account is active. When your account is deleted, your Barnaby conversations are permanently deleted within 30 days. Barnaby conversations are also deleted automatically once they are 12 months old, even if your account stays open. Records your community or the law requires us to keep, such as booking and financial records, may be kept longer.",
      "Security logs and activity history are kept as your community's rules require (typically up to 6 months for activity, longer for financial records).",
    ],
  },
  {
    h: "9. Security",
    p: [
      "We use encryption in transit, access controls based on your role, and private storage for provider documents. No system is perfectly secure. To report a security issue, email cobbcristian17@gmail.com.",
    ],
  },
  {
    h: "10. Your Choices and Rights",
    p: [
      "You can ask to access, correct, or delete your personal data, subject to your community's record-keeping rules and legal obligations. You can delete your account in the app or from our delete-account page.",
    ],
  },
  {
    h: "11. Children",
    p: [
      "The app is for adult residents, staff, and service providers. It is not directed to children under 13, and we do not knowingly collect their information.",
    ],
  },
  {
    h: "12. Changes",
    p: [
      "We may update this policy. We will change the date at the top and, for significant changes, let you know in the app.",
    ],
  },
  {
    h: "13. Contact",
    p: [
      "Barnaby, LLC, Marion County, Florida. Email: cobbcristian17@gmail.com. You can also contact your community administrator, or visit our Support page.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-grey">Last updated {UPDATED}</p>
      <div className="mt-8 space-y-6">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-semibold text-ink">{s.h}</h2>
            {s.p.map((para) => (
              <p key={para} className="mt-2 text-sm leading-relaxed text-gray-2">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
