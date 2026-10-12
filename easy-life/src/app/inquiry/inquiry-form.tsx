"use client";

import { useState } from "react";

const fieldClass =
  "mt-1.5 h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-[15px] text-[#0b1f1c] outline-none focus:border-[#b84a2f] focus:ring-2 focus:ring-[#b84a2f]/25";

const labelClass = "block text-[13px] font-semibold text-[#0b1f1c]";

export function InquiryForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [community, setCommunity] = useState("");
  const [interest, setInterest] = useState("Schedule a demo");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          community,
          interest,
          message,
          source: "google-ads",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_18px_40px_rgba(11,31,28,0.08)]">
        <h2 className="m-0 text-xl font-semibold tracking-tight">
          Thanks — we got your request
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#5c6b66]">
          Someone from Cobb Enterprise will contact you shortly about Easy Life
          for your community.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_18px_40px_rgba(11,31,28,0.08)] sm:p-6"
    >
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <label className={labelClass}>
        Full name *
        <input
          required
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
          placeholder="Alex Rivera"
        />
      </label>

      <label className={labelClass}>
        Work email *
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
          placeholder="you@yourclub.com"
        />
      </label>

      <label className={labelClass}>
        Phone
        <input
          type="tel"
          name="phone"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={fieldClass}
          placeholder="(555) 555-5555"
        />
      </label>

      <label className={labelClass}>
        Community / club name
        <input
          name="community"
          value={community}
          onChange={(e) => setCommunity(e.target.value)}
          className={fieldClass}
          placeholder="e.g. Oceanside, IronCrest, Golden Ocala"
        />
      </label>

      <label className={labelClass}>
        What do you want?
        <select
          name="interest"
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          className={fieldClass}
        >
          <option>Schedule a demo</option>
          <option>Pricing / proposal</option>
          <option>HOA / condo app</option>
          <option>Private club app</option>
          <option>Other</option>
        </select>
      </label>

      <label className={labelClass}>
        Anything else?
        <textarea
          name="message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1.5 w-full resize-y rounded-xl border border-black/15 bg-white px-4 py-3 text-[15px] text-[#0b1f1c] outline-none focus:border-[#b84a2f] focus:ring-2 focus:ring-[#b84a2f]/25"
          placeholder="Number of units, timeline, or questions…"
        />
      </label>

      <button
        type="submit"
        disabled={loading || !name.trim() || !email.trim()}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-[#b84a2f] text-[15px] font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Sending…" : "Submit — contact me"}
      </button>

      <p className="m-0 text-center text-[12px] text-[#5c6b66]">
        We’ll only use this to follow up about Easy Life.
      </p>
    </form>
  );
}
