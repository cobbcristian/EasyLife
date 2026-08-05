"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Eye, MapPin } from "lucide-react";
import { LoginHero } from "@/components/auth/login-hero";
import { Logo } from "@/components/ui/logo";
import { PROVIDER_PLANS, type ProviderPlanId } from "@/lib/provider-plans";
import {
  emailPolicyIssues,
  emailPolicyMessage,
  isRealSignupEmail,
} from "@/lib/email-policy";

const fieldClass =
  "h-[57px] w-full rounded-lg border border-border-2 bg-white px-4 text-[15px] text-ink placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const starterPlan = PROVIDER_PLANS.starter;
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
    isRealSignupEmail(contactEmail);

  async function startSubscriptionCheckout() {
    try {
      const res = await fetch("/api/stripe/subscription-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          returnPath: "/provider/subscribe?subscription=success",
        }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return true;
      }
    } catch {
      // fall through to subscribe page
    }
    return false;
  }

  async function handleProviderSignup() {
    setError(null);
    if (!isRealSignupEmail(email)) {
      setError(emailPolicyMessage(emailPolicyIssues(email)));
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign up failed");
        setLoading(false);
        return;
      }

      const checkoutStarted = await startSubscriptionCheckout();
      if (checkoutStarted) return;

      router.push(data.redirectTo ?? "/provider/subscribe");
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
          &gt; Sign Up
        </p>
      </div>

      <div className="relative flex flex-1 justify-center px-6 pb-12">
        <div className="pointer-events-none absolute left-0 top-1/2 hidden -translate-x-1/4 -translate-y-1/2 lg:block">
          <LoginHero />
        </div>
        <div className="w-full max-w-md lg:ml-[42%]">
          {step === 1 ? (
            <div>
              <h1 className="text-2xl font-bold text-ink">Welcome!</h1>
              <p className="mt-2 text-sm text-grey">
                Please provide a new email and password. This will replace the
                temporary email and password provided.
              </p>

              <form
                className="mt-8 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!step1Valid) return;
                  setStep(2);
                }}
              >
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                />
                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${fieldClass} pr-12`}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-grey-light"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label="Toggle password visibility"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-grey-light">
                    6 character minimum, includes number, includes symbol
                  </p>
                </div>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${fieldClass} pr-12`}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-grey-light"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label="Toggle confirm password visibility"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </div>

                <div className="pt-4">
                  <Pager step={1} />
                </div>
                <button
                  type="submit"
                  disabled={!step1Valid}
                  className={`mt-2 flex h-[50px] w-full items-center justify-center rounded-lg text-base font-semibold text-white ${
                    step1Valid ? "bg-[var(--mvp-blue)]" : "bg-[#e5e5ea]"
                  }`}
                >
                  Continue
                </button>
              </form>
            </div>
          ) : step === 2 ? (
            <div>
              <h1 className="text-2xl font-bold text-ink">Account Set Up</h1>
              <p className="mt-2 text-sm text-grey">
                Please provide a few details about your business to create your
                customized dashboard.
              </p>

              <form
                className="mt-8 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!step2Valid) return;
                  setStep(3);
                }}
              >
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
                    <option value="maintenance">Maintenance</option>
                    <option value="fitness">Fitness</option>
                    <option value="tennis">Tennis</option>
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
                  placeholder="Business Contact Email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={fieldClass}
                />

                <div className="pt-4">
                  <Pager step={2} />
                </div>
                <button
                  type="submit"
                  disabled={!step2Valid}
                  className={`mt-2 flex h-[50px] w-full items-center justify-center rounded-lg text-base font-semibold text-white ${
                    step2Valid ? "bg-[var(--mvp-blue)]" : "bg-[#e5e5ea]"
                  }`}
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-12 w-full text-sm font-medium text-grey hover:text-ink"
                >
                  Back
                </button>
              </form>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-ink">Choose your plan</h1>
              <p className="mt-2 text-sm text-grey">
                Subscribe to unlock your provider dashboard and start accepting
                bookings.
              </p>

              <div className="mt-8 space-y-4">
                {error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelectedPlan("starter")}
                  className={`w-full rounded-xl border-2 p-5 text-left transition ${
                    selectedPlan === "starter"
                      ? "border-[var(--mvp-blue)] bg-[var(--mvp-blue)]/5"
                      : "border-border-2 bg-white hover:border-[var(--mvp-blue)]/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink">{starterPlan.name}</p>
                      <p className="mt-1 text-sm text-grey">{starterPlan.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-ink">{starterPlan.priceLabel}</p>
                      <p className="text-xs text-grey">{starterPlan.period}</p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {starterPlan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-ink">
                        <Check className="h-4 w-4 shrink-0 text-[var(--mvp-blue)]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </button>

                <div className="pt-4">
                  <Pager step={3} />
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleProviderSignup}
                  className="mt-2 flex h-[50px] w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white disabled:opacity-60"
                >
                  {loading ? "Starting checkout..." : "Continue to payment"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-12 w-full text-sm font-medium text-grey hover:text-ink"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
