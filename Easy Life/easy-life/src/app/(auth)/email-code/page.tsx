"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginHero } from "@/components/auth/login-hero";
import { Logo } from "@/components/ui/logo";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Figma Email Code (4616:17523 / 4616:17535 / 4616:17547). */
function EmailCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const challengeToken = searchParams.get("challenge") ?? "";
  const email = searchParams.get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const canSubmit = useMemo(() => code.replace(/\D/g, "").length >= 5, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = code.replace(/\D/g, "").slice(0, 5);
    if (!challengeToken || digits.length < 5) {
      setError(t("The code entered does not match the one sent to your email."));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken, code: digits }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setError(
          data.error ??
            t("The code entered does not match the one sent to your email."),
        );
        setLoading(false);
        return;
      }
      router.push(`/reset-password?token=${encodeURIComponent(String(data.token))}`);
    } catch {
      setError(t("Something went wrong. Please try again."));
      setLoading(false);
    }
  }

  async function sendAgain() {
    setResending(true);
    setError(null);
    if (!email) {
      setResending(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.challengeToken) {
        const params = new URLSearchParams({
          challenge: String(data.challengeToken),
          email,
        });
        if (data.code) {
          params.set("devCode", String(data.code));
        }
        router.replace(`/email-code?${params.toString()}`);
      } else if (!res.ok) {
        setError(data.error ?? t("Something went wrong. Please try again."));
      }
    } catch {
      setError(t("Something went wrong. Please try again."));
    }
    setResending(false);
  }

  const devCode = searchParams.get("devCode");

  return (
    <div className="w-full max-w-[514px] font-[family-name:var(--font-poppins)]">
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.02em] text-ink">
        {t("Enter the Code")}
      </h1>
      <p className="mt-2 text-sm text-ink">
        {t("Check your mailbox & enter the code we just sent to you.")}
      </p>
      {devCode ? (
        <p className="mt-2 text-xs text-grey">
          {t("Dev OTP")}: {devCode}
        </p>
      ) : null}
      <button
        type="button"
        onClick={sendAgain}
        disabled={resending}
        className="mt-2 text-sm font-medium text-[var(--mvp-blue)] underline disabled:opacity-60"
      >
        {t("Send again")}
      </button>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="- - - - -"
            value={code}
            onChange={(e) => {
              const next = e.target.value.replace(/[^\d\s]/g, "").slice(0, 9);
              setCode(next);
              setError(null);
            }}
            className={cn(
              "h-[57px] w-full rounded-lg border bg-white px-8 text-[16px] tracking-[0.2em] text-ink placeholder:tracking-[0.2em] placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]",
              error ? "border-[#ff3b30]" : "border-border-2",
            )}
          />
          {error ? (
            <p className="mt-2 text-sm text-[#ff3b30]">{error}</p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="flex h-[50px] w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white disabled:bg-[#e5e5ea] disabled:text-white/80"
        >
          {loading ? t("Checking…") : t("Reset Password")}
        </button>
      </form>
    </div>
  );
}

export default function EmailCodePage() {
  const { t } = useI18n();
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
          &gt;{" "}
          <Link href="/forgot-password" className="hover:underline">
            {t("Forgot Password")}
          </Link>{" "}
          &gt; {t("Password Reset")}
        </p>
      </div>
      <div className="relative flex flex-1 items-center">
        <div className="pointer-events-none absolute left-0 top-1/2 hidden -translate-x-1/4 -translate-y-1/2 lg:block">
          <LoginHero />
        </div>
        <div className="mx-auto w-full max-w-md px-6 lg:ml-[42%] lg:px-0">
          <Suspense fallback={null}>
            <EmailCodeForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
