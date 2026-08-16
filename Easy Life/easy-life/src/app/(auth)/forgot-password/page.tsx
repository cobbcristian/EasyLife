"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginHero } from "@/components/auth/login-hero";
import { Logo } from "@/components/ui/logo";
import { useI18n } from "@/lib/i18n";

/** Figma Forgot Password (4616:17511). */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("Something went wrong. Please try again."));
        setLoading(false);
        return;
      }
      const params = new URLSearchParams({
        email: email.trim(),
      });
      if (data.challengeToken) {
        params.set("challenge", String(data.challengeToken));
      }
      // Local-only: OTP is returned when email delivery is not configured.
      if (data.code) {
        params.set("devCode", String(data.code));
      }
      router.push(`/email-code?${params.toString()}`);
    } catch {
      setError(t("Something went wrong. Please try again."));
      setLoading(false);
    }
  }

  const canSubmit = email.trim().length > 0 && !loading;

  return (
    <div className="flex min-h-screen flex-col bg-white font-[family-name:var(--font-poppins)]">
      <header className="flex h-[72px] items-center border-b border-border-2 px-8">
        <Logo size="md" />
      </header>

      <div className="px-6 py-4">
        <p className="text-sm font-medium text-[var(--mvp-blue)]">
          <Link href="/login" className="hover:underline">
            {t("Login")}
          </Link>{" "}
          &gt; {t("Forgot Password")}
        </p>
      </div>

      <div className="relative flex flex-1 items-center">
        <div className="pointer-events-none absolute left-0 top-1/2 hidden -translate-x-1/4 -translate-y-1/2 lg:block">
          <LoginHero />
        </div>

        <div className="mx-auto w-full max-w-[514px] px-6 lg:ml-[42%] lg:px-0">
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.02em] text-ink">
            {t("Forgot Password")}
          </h1>
          <p className="mt-2 text-sm text-grey">
            {t(
              "Enter the email associated with your account and we'll send you a code to reset your password.",
            )}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <input
              type="email"
              name="email"
              placeholder={t("Email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-[57px] w-full rounded-lg border border-border-2 bg-white px-8 text-[15px] text-ink placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex h-[50px] w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white disabled:bg-[#e5e5ea] disabled:text-white/80"
            >
              {loading ? t("Sending…") : t("Send Code")}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
