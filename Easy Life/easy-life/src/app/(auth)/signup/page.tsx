"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Eye, MapPin } from "lucide-react";
import { LoginHero } from "@/components/auth/login-hero";
import { Logo } from "@/components/ui/logo";
import { PROVIDER_PLANS, type ProviderPlanId } from "@/lib/provider-plans";
import {
  DEMO_TENANT_COOKIE,
  DEMO_TENANTS,
  parseTenantId,
} from "@/lib/tenant";
import {
  emailPolicyIssues,
  emailPolicyMessage,
  isRealSignupEmail,
} from "@/lib/email-policy";

const fieldClass =
  "h-[57px] w-full rounded-lg border border-border-2 bg-white px-4 text-[15px] text-ink placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

function readTenantCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${DEMO_TENANT_COOKIE}=`));
  if (!match) return null;
  const raw = decodeURIComponent(match.split("=").slice(1).join("="));
  const id = parseTenantId(raw);
  return id ? DEMO_TENANTS[id].communityId : null;
}

function Pager({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex justify-center gap-2">
      {([1, 2, 3] as const).map((n) => (
        <span
          key={n}
          className={`h-1.5 w-4 rounded-full ${step === n ? "bg-[var(--mvp-blue)]" : "bg-border-2"}`}
        />
      ))}
    </div>
  );
}

const COMMUNITY_OPTIONS = Object.values(DEMO_TENANTS)
  .map((t) => ({ id: t.communityId, name: t.communityName || t.productName }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPlan, setSelectedPlan] = useState<ProviderPlanId>("starter");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [bizType, setBizType] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [communityId, setCommunityId] = useState("");
  const [tenantLocked, setTenantLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const locked = readTenantCookie();
    if (locked) {
      setCommunityId(locked);
      setTenantLocked(true);
    }
  }, []);

  const communityLabel = useMemo(() => {
    const hit = COMMUNITY_OPTIONS.find((c) => c.id === communityId);
    return hit?.name ?? "";
  }, [communityId]);

  const step1Valid =
    isRealSignupEmail(email) &&
    password.length >= 6 &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password) &&
    password === confirmPassword;
  const step2Valid =
    businessName.trim().length > 0 &&
    category &&
    bizType &&
    address.trim().length > 0 &&
    phone.trim().length > 0 &&
    isRealSignupEmail(contactEmail) &&
    Boolean(communityId);

  async function handleProviderSignup() {
    setError(null);
    if (!isRealSignupEmail(email)) {
      setError(emailPolicyMessage(emailPolicyIssues(email)));
      return;
    }
    if (!communityId) {
      setError("Select the community you want to serve");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "provider",
          email,
          password,
          name: businessName,
          role: "provider",
          plan: selectedPlan,
          communityId,
          phone,
          category,
          bizType,
          address,
          contactName: businessName,
          featured: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign up failed");
        setLoading(false);
        return;
      }

      router.push(data.redirectTo ?? "/provider");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex h-[72px] items-center border-b border-border-2 px-8">
        <Logo size="md" />
      </header>

      <div className="px-6 py-4">
        <p className="text-sm font-medium text-[var(--mvp-blue)]">
          <Link href="/login" className="hover:underline">
            Login
          </Link>{" "}
          &gt; Provider Sign Up
        </p>
      </div>

      <div className="relative flex flex-1 justify-center px-6 pb-12">
        <div className="pointer-events-none absolute left-0 top-1/2 hidden -translate-x-1/4 -translate-y-1/2 lg:block">
          <LoginHero />
        </div>
        <div className="w-full max-w-md lg:ml-[42%]">
          {step === 1 ? (
            <div>
              <h1 className="text-2xl font-bold text-ink">Create a provider account</h1>
              <p className="mt-2 text-sm text-grey">
                Join as a service provider. After signup you appear in Local Pros
                and can be featured in the Sponsored area on the member home.
              </p>

              <form
                className="mt-8 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!step1Valid) return;
                  setContactEmail(email);
                  setStep(2);
                }}
              >
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                  autoComplete="email"
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={fieldClass}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-grey"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="Toggle password visibility"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={fieldClass}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-grey"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label="Toggle confirm password visibility"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs text-grey">
                  Use at least 6 characters with a number and a symbol.
                </p>
                <button
                  type="submit"
                  disabled={!step1Valid}
                  className="mt-2 flex h-[57px] w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-[15px] font-semibold text-white disabled:opacity-40"
                >
                  Continue
                </button>
                <Pager step={1} />
              </form>
            </div>
          ) : step === 2 ? (
            <div>
              <h1 className="text-2xl font-bold text-ink">Business details</h1>
              <p className="mt-2 text-sm text-grey">
                Tell us about your business so residents can find and book you.
              </p>

              <form
                className="mt-8 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!step2Valid) return;
                  setStep(3);
                }}
              >
                <div className="relative">
                  <select
                    className={`${fieldClass} appearance-none pr-12 ${!communityId ? "text-grey" : "text-ink"}`}
                    value={communityId}
                    disabled={tenantLocked}
                    onChange={(e) => setCommunityId(e.target.value)}
                  >
                    <option value="" disabled>
                      Community you serve
                    </option>
                    {COMMUNITY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-grey-light" />
                </div>
                {tenantLocked && communityLabel ? (
                  <p className="text-xs text-grey">
                    Locked to {communityLabel} from your demo /go link.
                  </p>
                ) : null}
                <input
                  placeholder="Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={fieldClass}
                />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCategoryOpen((o) => !o)}
                    className={`${fieldClass} flex items-center justify-between text-left ${
                      !bizType ? "text-grey" : "text-ink"
                    }`}
                    aria-expanded={categoryOpen}
                    aria-haspopup="listbox"
                  >
                    <span>
                      {bizType === "food"
                        ? "Food"
                        : bizType === "service"
                          ? "Service"
                          : bizType === "activity"
                            ? "Activity"
                            : "Category"}
                    </span>
                    <ChevronDown className="h-5 w-5 text-grey-light" />
                  </button>
                  {categoryOpen ? (
                    <div
                      role="listbox"
                      className="absolute left-0 top-[calc(100%+6px)] z-20 w-[220px] overflow-hidden rounded-xl border border-border-2 bg-white py-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                    >
                      <p className="px-4 pb-1 text-sm font-semibold text-ink">Category</p>
                      {(
                        [
                          { value: "food", label: "Food" },
                          { value: "service", label: "Service" },
                          { value: "activity", label: "Activity" },
                        ] as const
                      ).map((opt) => {
                        const selected = bizType === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setBizType(opt.value);
                              setCategoryOpen(false);
                            }}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-ink hover:bg-[#f8f9fb]"
                          >
                            {opt.label}
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded border ${
                                selected
                                  ? "border-[var(--mvp-blue)] bg-[var(--mvp-blue)] text-white"
                                  : "border-border-2 bg-white"
                              }`}
                            >
                              {selected ? <Check className="h-3.5 w-3.5" /> : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="relative">
                  <select
                    className={`${fieldClass} appearance-none pr-12 ${!category ? "text-grey" : "text-ink"}`}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="" disabled>
                      Type
                    </option>
                    <option value="cleaning">Cleaning</option>
                    <option value="landscaping">Landscaping</option>
                    <option value="maintenance">Handyman / Maintenance</option>
                    <option value="flooring">Floor Installation</option>
                    <option value="painting">Painting</option>
                    <option value="pool">Pool</option>
                    <option value="pest">Pest Control</option>
                    <option value="fitness">Fitness</option>
                    <option value="tennis">Tennis</option>
                    <option value="other">Other</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-grey-light" />
                </div>
                <div className="relative">
                  <input
                    placeholder="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`${fieldClass} pr-12 text-[var(--mvp-blue)]`}
                  />
                  <MapPin className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--mvp-blue)]" />
                </div>
                <input
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={fieldClass}
                />
                <input
                  placeholder="Contact email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={fieldClass}
                />
                <button
                  type="submit"
                  disabled={!step2Valid}
                  className="mt-2 flex h-[57px] w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-[15px] font-semibold text-white disabled:opacity-40"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full text-center text-sm font-medium text-[var(--mvp-blue)]"
                >
                  Back
                </button>
                <Pager step={2} />
              </form>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-ink">Choose your plan</h1>
              <p className="mt-2 text-sm text-grey">
                Starter includes Local Pros listing and Featured / Sponsored
                placement on the member home for {communityLabel || "your community"}.
              </p>
              <div className="mt-8 space-y-3">
                {Object.values(PROVIDER_PLANS).map((plan) => {
                  const selected = selectedPlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`w-full rounded-xl border px-4 py-4 text-left ${
                        selected
                          ? "border-[var(--mvp-blue)] bg-[var(--mvp-blue)]/5"
                          : "border-border-2"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-ink">{plan.name}</p>
                        {selected ? (
                          <Check className="h-5 w-5 text-[var(--mvp-blue)]" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-grey">{plan.description}</p>
                    </button>
                  );
                })}
              </div>
              {error ? (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleProviderSignup()}
                className="mt-6 flex h-[57px] w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-[15px] font-semibold text-white disabled:opacity-40"
              >
                {loading ? "Creating account…" : "Create provider account"}
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-3 w-full text-center text-sm font-medium text-[var(--mvp-blue)]"
              >
                Back
              </button>
              <Pager step={3} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
