"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SsoButtons } from "@/components/auth/sso-buttons";
import {
  isPasswordStrongEnough,
  passwordPolicyIssues,
  passwordPolicyMessages,
} from "@/lib/password-policy";
import {
  emailPolicyIssues,
  emailPolicyMessage,
  isRealSignupEmail,
} from "@/lib/email-policy";
import { scrollFieldIntoView } from "@/lib/scroll-field-into-view";

const fieldClass =
  "h-10 w-full rounded-md border border-[#c8c8c8] bg-white px-3 text-[16px] text-[#222] placeholder:text-[#9a9a9a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c3a4a]/30";

const btnClass =
  "flex h-10 w-full items-center justify-center rounded-md bg-[#1c3a4a] text-[15px] font-semibold text-white transition hover:bg-[#152c38] disabled:opacity-60";

export type OceansideRegisterBranding = {
  productName: string;
  communityName: string;
  logoSrc: string;
  communityId: string;
};

export function OceansideRegisterForm({
  branding,
}: {
  branding: OceansideRegisterBranding;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [unit, setUnit] = useState("");
  const [showInDirectory, setShowInDirectory] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const policyIssues = useMemo(
    () => passwordPolicyIssues(password, confirm),
    [password, confirm],
  );
  const complexityMessages = useMemo(
    () =>
      passwordPolicyMessages(
        policyIssues.filter((i) => i !== "mismatch"),
      ),
    [policyIssues],
  );
  const showComplexity =
    submitted && password.length > 0 && !isPasswordStrongEnough(password);
  const showMismatch =
    submitted && policyIssues.includes("mismatch") && confirm.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);

    if (!isRealSignupEmail(email)) {
      setError(emailPolicyMessage(emailPolicyIssues(email)));
      return;
    }
    if (!isPasswordStrongEnough(password) || password !== confirm) {
      return;
    }
    if (!unit.trim()) {
      setError("Unit number is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "join",
          role: "member",
          email,
          password,
          name: `${firstName} ${lastName}`.trim(),
          communityId: branding.communityId,
          unit: unit.trim(),
          directoryVisible: showInDirectory,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        setLoading(false);
        return;
      }
      router.push(data.redirectTo ?? "/register/pending");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#f2f2f2] font-[family-name:var(--font-poppins)]">
      <header className="flex h-11 shrink-0 items-center bg-white px-4 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={branding.logoSrc}
          alt={branding.productName}
          className="h-7 w-auto max-w-[160px] object-contain"
        />
      </header>

      {/* All data entry stays in the top ~60% so the soft keyboard never covers fields. */}
      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col px-3 pt-2 pb-2">
        <div className="flex max-h-[60dvh] flex-col overflow-hidden rounded-lg bg-white px-3 py-2.5 shadow-sm">
          <h1 className="shrink-0 text-[18px] font-bold tracking-tight text-[#1a1a1a]">
            Register
          </h1>

          <form
            className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
            onSubmit={handleSubmit}
            noValidate
          >
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] text-red-700">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <input
                className={fieldClass}
                placeholder="First name"
                autoComplete="given-name"
                enterKeyHint="next"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onFocus={scrollFieldIntoView}
                required
              />
              <input
                className={fieldClass}
                placeholder="Last name"
                autoComplete="family-name"
                enterKeyHint="next"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onFocus={scrollFieldIntoView}
                required
              />
            </div>

            <input
              className={fieldClass}
              type="email"
              placeholder="Email"
              autoComplete="email"
              inputMode="email"
              enterKeyHint="next"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={scrollFieldIntoView}
              required
            />

            {showComplexity ? (
              <p className="text-[12px] leading-snug text-[#c62828]">
                {complexityMessages.join(" ")}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <input
                className={fieldClass}
                type="password"
                placeholder="Password"
                autoComplete="new-password"
                enterKeyHint="next"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={scrollFieldIntoView}
                required
              />
              <div>
                <input
                  className={fieldClass}
                  type="password"
                  placeholder="Confirm"
                  autoComplete="new-password"
                  enterKeyHint="next"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onFocus={scrollFieldIntoView}
                  required
                />
                {showMismatch ? (
                  <p className="mt-1 text-[11px] text-[#c62828]">
                    Passwords do not match.
                  </p>
                ) : null}
              </div>
            </div>

            <input
              className={fieldClass}
              placeholder="Unit number"
              autoComplete="off"
              enterKeyHint="done"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              onFocus={scrollFieldIntoView}
              required
            />

            <label className="flex items-center gap-2 py-0.5 text-[13px] text-[#333]">
              <input
                type="checkbox"
                checked={showInDirectory}
                onChange={(e) => setShowInDirectory(e.target.checked)}
                className="h-4 w-4 rounded border-[#999] accent-[#1c3a4a]"
              />
              Show in residents directory
            </label>

            <button type="submit" className={btnClass} disabled={loading}>
              {loading ? "Signing up…" : "Sign Up"}
            </button>
          </form>
        </div>

        <div className="mt-2 shrink-0 space-y-2 px-1">
          <SsoButtons className="mt-0" />
          <p className="text-center text-[13px] text-[#666]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#1c3a4a] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
