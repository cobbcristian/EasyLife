"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { LoginHero } from "@/components/auth/login-hero";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useI18n } from "@/lib/i18n";

const fieldClass =
  "h-[57px] w-full rounded-lg border border-border-2 bg-white px-8 text-[15px] text-ink placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const canSubmit =
    password.length >= 6 &&
    hasNumber &&
    hasSymbol &&
    confirm.length > 0 &&
    !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError(t("This reset link is invalid or has expired."));
      return;
    }
    if (password.length < 6) {
      setError(t("Password must be at least 6 characters"));
      return;
    }
    if (password !== confirm) {
      setError(t("Passwords do not match"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("Could not reset password"));
        setLoading(false);
        return;
      }
      setDone(true);
      setLoading(false);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError(t("Something went wrong. Please try again."));
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <h1 className="text-[32px] font-bold leading-tight text-ink">{t("Reset your password")}</h1>
        <p className="mt-4 text-sm text-red-700">{t("This reset link is invalid or has expired.")}</p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm font-medium text-[var(--mvp-blue)] hover:underline"
        >
          {t("Request a new link")}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-md">
        <h1 className="text-[32px] font-bold leading-tight text-ink">{t("Password updated")}</h1>
        <p className="mt-4 text-sm text-grey">{t("You can now sign in with your new password.")}</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-[var(--mvp-blue)] hover:underline"
        >
          {t("Go to login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[514px] font-[family-name:var(--font-poppins)]">
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.02em] text-ink">
        {t("Create New Password")}
      </h1>
      <p className="mt-2 text-sm text-ink">
        {t("This password must be different from previous passwords.")}
      </p>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder={t("Password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={`${fieldClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-grey"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-grey">
            {t("6 character minimum, includes number, includes symbol")}
          </p>
        </div>
        <input
          type={showPassword ? "text" : "password"}
          name="confirm"
          placeholder={t("Confirm Password")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          className={fieldClass}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex h-[50px] w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white disabled:bg-[#e5e5ea] disabled:text-[#aeaeb2]"
        >
          {loading ? t("Saving…") : t("Confirm Password")}
        </button>
        <Link
          href="/login"
          className="block text-center text-sm font-medium text-[var(--mvp-blue)] hover:underline"
        >
          {t("Back to login")}
        </Link>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-white font-[family-name:var(--font-poppins)]">
      <header className="flex h-[72px] items-center justify-between border-b border-border-2 px-8">
        <Logo size="md" />
        <LanguageSwitcher />
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
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
