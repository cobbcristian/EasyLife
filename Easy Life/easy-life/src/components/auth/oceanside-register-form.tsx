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

const fieldClass =
  "h-[48px] w-full rounded-md border border-[#c8c8c8] bg-white px-4 text-[15px] text-[#222] placeholder:text-[#9a9a9a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c3a4a]/30";

const btnClass =
  "mt-2 flex h-[48px] w-full items-center justify-center rounded-md bg-[#1c3a4a] text-[15px] font-semibold text-white transition hover:bg-[#152c38] disabled:opacity-60";

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
    <div className="flex min-h-screen flex-col bg-[#f2f2f2] font-[family-name:var(--font-poppins)]">
      <header className="flex h-[72px] items-center bg-white px-6 shadow-sm sm:px-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={branding.logoSrc}
          alt={branding.productName}
          className="h-11 w-auto max-w-[220px] object-contain"
        />
      </header>

      <main className="flex flex-1 justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[520px] rounded-lg bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
          <h1 className="text-[28px] font-bold tracking-tight text-[#1a1a1a]">
            Register
          </h1>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className={fieldClass}
                placeholder="First Name..."
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                className={fieldClass}
                placeholder="Last Name..."
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <input
              className={fieldClass}
              type="email"
              placeholder="Email..."
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {showComplexity ? (
              <p className="text-[13px] leading-snug text-[#c62828]">
                {complexityMessages.join(" ")}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className={fieldClass}
                type="password"
                placeholder="Your password.."
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div>
                <input
                  className={fieldClass}
                  type="password"
                  placeholder="Confirm password.."
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                {showMismatch ? (
                  <p className="mt-1.5 text-[13px] text-[#c62828]">
                    The password and confirmation password do not match.
                  </p>
                ) : null}
              </div>
            </div>

            <input
              className={fieldClass}
              placeholder="Unit number..."
              autoComplete="off"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
            />

            <label className="flex items-center gap-2.5 pt-1 text-[14px] text-[#333]">
              <input
                type="checkbox"
                checked={showInDirectory}
                onChange={(e) => setShowInDirectory(e.target.checked)}
                className="h-4 w-4 rounded border-[#999] accent-[#1c3a4a]"
              />
              Show Profile in residents Directory.
            </label>

            <button type="submit" className={btnClass} disabled={loading}>
              {loading ? "Signing up…" : "Sign Up"}
            </button>
          </form>

          <SsoButtons className="mt-2" />

          <p className="mt-6 text-center text-sm text-[#666]">
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
