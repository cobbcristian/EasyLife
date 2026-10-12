"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginHero } from "@/components/auth/login-hero";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useI18n } from "@/lib/i18n";
import {
  emailPolicyIssues,
  emailPolicyMessage,
  isRealSignupEmail,
} from "@/lib/email-policy";
import { scrollFieldIntoView } from "@/lib/scroll-field-into-view";

type PublicCommunity = { id: string; name: string; location: string };
type RegisterMode = "setup" | "join";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  // Prefill from an invite link, e.g. /register?communityId=...&code=...&email=...
  // Read once via lazy initializers so this never fires a post-mount setState.
  const [invitedCommunityId] = useState(() => searchParams.get("communityId") ?? "");
  const [invitedCode] = useState(() => searchParams.get("code") ?? "");
  const [invitedEmail] = useState(() => searchParams.get("email") ?? "");
  const [mode, setMode] = useState<RegisterMode>(() =>
    invitedCommunityId || invitedCode || invitedEmail ? "join" : "setup",
  );
  const [communities, setCommunities] = useState<PublicCommunity[]>([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    communityName: "",
    city: "",
    state: "",
    communityId: invitedCommunityId,
    inviteCode: invitedCode,
    unit: "",
    email: invitedEmail,
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isOceanside = form.communityId === "oceanside-residents";

  useEffect(() => {
    fetch("/api/communities/public")
      .then((r) => r.json())
      .then((d) => setCommunities(d.communities ?? []))
      .catch(() => {});
  }, []);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isRealSignupEmail(form.email)) {
      setError(emailPolicyMessage(emailPolicyIssues(form.email)));
      return;
    }
    setLoading(true);
    try {
      const payload =
        mode === "join"
          ? {
              mode: "join" as const,
              email: form.email,
              password: form.password,
              name: `${form.firstName} ${form.lastName}`.trim(),
              communityId: form.communityId,
              inviteCode: form.inviteCode.trim() || undefined,
              unit: form.unit.trim() || undefined,
              role: "member" as const,
            }
          : {
              mode: "setup" as const,
              email: form.email,
              password: form.password,
              name: `${form.firstName} ${form.lastName}`.trim(),
              communityName: form.communityName,
              city: form.city,
              state: form.state,
            };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        setLoading(false);
        return;
      }
      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-white">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border-2 px-4 sm:px-8">
        <Logo size="sm" />
        <LanguageSwitcher />
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="pointer-events-none absolute left-0 top-1/2 hidden -translate-x-1/4 -translate-y-1/2 lg:block">
          <LoginHero />
        </div>

        <div className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col px-4 pt-3 lg:ml-[42%] lg:px-0">
          <h1 className="shrink-0 text-[22px] font-bold text-ink sm:text-[28px]">
            {t("Create your account")}
          </h1>
          <p className="mt-1 shrink-0 text-[13px] text-grey">
            {mode === "setup"
              ? t("Set up a new community and become its club admin.")
              : t("Join your community as a member.")}
          </p>

          <div className="mt-3 flex shrink-0 rounded-lg border border-border-1 p-1">
            <button
              type="button"
              onClick={() => setMode("setup")}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium ${
                mode === "setup" ? "bg-[var(--mvp-blue)] text-white" : "text-grey hover:text-ink"
              }`}
            >
              New community
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium ${
                mode === "join" ? "bg-[var(--mvp-blue)] text-white" : "text-grey hover:text-ink"
              }`}
            >
              Join a club
            </button>
          </div>

          {/* Fields stay in the top ~60% of the viewport above the soft keyboard. */}
          <form
            className="mt-3 max-h-[60dvh] space-y-2.5 overflow-y-auto overscroll-contain pb-3 [-webkit-overflow-scrolling:touch]"
            onSubmit={handleSubmit}
          >
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  onFocus={scrollFieldIntoView}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  onFocus={scrollFieldIntoView}
                  required
                />
              </div>
            </div>

            {mode === "setup" ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="communityName">Community name</Label>
                  <Input
                    id="communityName"
                    placeholder="e.g. Willow Creek"
                    value={form.communityName}
                    onChange={(e) => update("communityName", e.target.value)}
                    onFocus={scrollFieldIntoView}
                    required
                  />
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Austin"
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      onFocus={scrollFieldIntoView}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="TX"
                      value={form.state}
                      onChange={(e) => update("state", e.target.value)}
                      onFocus={scrollFieldIntoView}
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor="communityId">Your community</Label>
                  <Select
                    id="communityId"
                    value={form.communityId}
                    onChange={(e) => update("communityId", e.target.value)}
                    onFocus={scrollFieldIntoView}
                    required
                  >
                    <option value="">Select a community…</option>
                    {communities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.location}
                      </option>
                    ))}
                  </Select>
                </div>
                {isOceanside ? (
                  <div className="space-y-1">
                    <Label htmlFor="unit">{t("Unit number")}</Label>
                    <Input
                      id="unit"
                      placeholder={t("e.g. 1112")}
                      value={form.unit}
                      onChange={(e) => update("unit", e.target.value)}
                      onFocus={scrollFieldIntoView}
                      required
                    />
                    <p className="text-xs text-grey">
                      {t(
                        "Your account stays pending until association management approves you. Then you can sign in and appear in the directory.",
                      )}
                    </p>
                  </div>
                ) : null}
                <div className="space-y-1">
                  <Label htmlFor="inviteCode">
                    {t("Invite code")}
                    {isOceanside ? ` (${t("optional")})` : ""}
                  </Label>
                  <Input
                    id="inviteCode"
                    placeholder={t("From your community admin")}
                    value={form.inviteCode}
                    onChange={(e) => update("inviteCode", e.target.value)}
                    onFocus={scrollFieldIntoView}
                    required={!isOceanside}
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                onFocus={scrollFieldIntoView}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                onFocus={scrollFieldIntoView}
                required
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-grey">
              <input type="checkbox" className="mt-1" required />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="font-medium text-[var(--mvp-blue)] hover:text-[var(--mvp-blue)]">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-medium text-[var(--mvp-blue)] hover:text-[var(--mvp-blue)]">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Creating account..." : mode === "setup" ? "Create community" : "Join community"}
            </Button>
          </form>

          <p className="mt-auto shrink-0 py-3 text-center text-sm text-grey">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--mvp-blue)] hover:text-[var(--mvp-blue)]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
