"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { faqs } from "@/lib/member-data";

const recipients = [
  { value: "property_manager", label: "Property Management" },
  { value: "board", label: "Board Members" },
  { value: "admin", label: "Administrators" },
  { value: "committee", label: "Committee Members" },
];

const fieldClass =
  "h-12 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm text-ink outline-none focus:border-[var(--mvp-blue)]";

export default function MemberContactPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [recipient, setRecipient] = useState(recipients[0].value);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject || !message) {
      toast({
        variant: "warning",
        title: t("Missing details"),
        description: t("Add a subject and message."),
      });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, subject, message }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not send") });
      return;
    }
    const label = recipients.find((r) => r.value === recipient)?.label;
    toast({
      variant: "success",
      title: t("Message sent"),
      description: t(`Delivered to ${label}.`),
    });
    setSubject("");
    setMessage("");
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
            {t("Member")}
          </p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {t("Contact & Help")}
          </h1>
        </header>

        <div className="space-y-6 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <h2 className="text-[15px] font-semibold text-ink">{t("Send a message")}</h2>
            <select
              className={fieldClass}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            >
              {recipients.map((r) => (
                <option key={r.value} value={r.value}>
                  {t(r.label)}
                </option>
              ))}
            </select>
            <input
              className={fieldClass}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("Subject")}
            />
            <textarea
              className="min-h-[140px] w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 py-3 text-sm outline-none focus:border-[var(--mvp-blue)]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("Message")}
            />
            <button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("Send message")}
            </button>
          </form>

          <section>
            <h2 className="text-[15px] font-semibold text-ink">{t("Help & FAQ")}</h2>
            <ul className="mt-3 divide-y divide-[#eceff3]">
              {faqs.map((f) => (
                <li key={f.q} className="py-3">
                  <p className="text-sm font-semibold text-ink">{f.q}</p>
                  <p className="mt-1 text-sm text-grey">{f.a}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
