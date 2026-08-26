"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { LoginHero } from "@/components/auth/login-hero";
import { DemoLoginCheatSheet } from "@/components/auth/demo-login-cheat-sheet";
import { SsoButtons } from "@/components/auth/sso-buttons";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useI18n } from "@/lib/i18n";
import { brandAssets } from "@/lib/brand-assets";
import {
  getDemoTenantById,
  tenantFaviconSrc,
  type DemoLogin,
} from "@/lib/tenant";

/** Figma Login View — node 9750:8570 */
const fieldClass =
  "h-[57px] w-full rounded-lg border border-[#bfbfbf] bg-white px-8 text-[14px] text-ink placeholder:text-[#858586] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]";

type LoginBranding = {
  tenantId?: string;
  productName: string;
  communityName: string;
  logoSrc: string;
  loginHeroSrc?: string;
  defaultEmail: string;
  locked: boolean;
  demoLogins?: DemoLogin[];
  /** Live resident tenant (Oceanside) — no sales-demo chrome. */
  liveProduction?: boolean;
};

const SUPER_ADMIN_EMAIL = "superadmin@gmail.com";

function LoginForm({ branding }: { branding: LoginBranding | null }) {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const unlockedDefaultEmail = branding?.locked
    ? (branding.defaultEmail ?? "")
    : SUPER_ADMIN_EMAIL;
  const [email, setEmail] = useState(unlockedDefaultEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  // Switching /go/[tenant] must reset the form — useState alone keeps the old club email.
  // One-tap sales links pass ?email=&password= through /go/[tenant].
  useEffect(() => {
    const qEmail = searchParams.get("email");
    const qPassword = searchParams.get("password");
    const qError = searchParams.get("error");
    const qMfa = searchParams.get("mfaToken");
    const roleHint = searchParams.get("role")?.toLowerCase();
    const roleMatch =
      roleHint && branding?.demoLogins
        ? branding.demoLogins.find((l) =>
            l.role.toLowerCase().includes(roleHint.replace(/_/g, " ")),
          )
        : null;
    setEmail(
      qEmail ||
        roleMatch?.email ||
        (branding?.locked ? branding.defaultEmail : SUPER_ADMIN_EMAIL) ||
        "",
    );
    setPassword(qPassword || roleMatch?.password || "");
    setError(qError);
    setMfaToken(qMfa);
    setMfaCode("");
  }, [branding?.tenantId, branding?.defaultEmail, branding?.demoLogins, branding?.locked, searchParams]);

  const canSubmit =
    !loading &&
    (mfaToken
      ? mfaCode.trim().length >= 6
      : email.trim().length > 0 && password.length > 0);

  async function completeLogin(data: { redirectTo?: string }) {
    const redirect = searchParams.get("redirect");
    const destination =
      redirect && redirect.startsWith("/")
        ? redirect
        : (data.redirectTo ?? "/dashboard");
    // Hard navigation — Next soft routing hangs on Azure (stuck "Signing in…",
    // menu clicks needing a refresh). Location.assign always completes.
    window.location.assign(destination);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      if (mfaToken) {
        const res = await fetch("/api/auth/mfa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mfaToken, code: mfaCode.trim() }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          redirectTo?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "Invalid code");
          setLoading(false);
          return;
        }
        await completeLogin(data);
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          demoTenantId: branding?.tenantId,
        }),
      });
      let data: {
        error?: string;
        redirectTo?: string;
        suggestedGo?: string;
        mfaRequired?: boolean;
        mfaToken?: string;
      } = {};
      try {
        data = await res.json();
      } catch {
        setError(
          "Server error — check that the database is configured and try again.",
        );
        setLoading(false);
        return;
      }
      if (!res.ok) {
        // Wrong club cookie vs email — jump to that club's /go entry and lock branding.
        // Skip redirect when we're already on that club (stale cookie mislabeled the error).
        const suggested = data.suggestedGo;
        const suggestedId = suggested
          ?.match(/^\/go\/([a-z0-9-]+)/i)?.[1]
          ?.toLowerCase()
          .replace(/-/g, "");
        if (
          suggested?.startsWith("/go/") &&
          suggestedId &&
          suggestedId !== branding?.tenantId
        ) {
          window.location.href = suggested;
          return;
        }
        // Tenant mismatch (403): name the club on this page, not a stale cookie club.
        if (
          res.status === 403 &&
          branding?.locked &&
          (Boolean(data.suggestedGo) || data.error?.includes("demo is limited"))
        ) {
          setError(
            `This ${branding.productName} demo is limited to ${branding.communityName} members and staff. Use a ${branding.productName} demo login.`,
          );
        } else {
          setError(data.error ?? "Login failed");
        }
        setLoading(false);
        return;
      }
      if (data.mfaRequired && data.mfaToken) {
        setMfaToken(data.mfaToken);
        setMfaCode("");
        setLoading(false);
        return;
      }
      await completeLogin(data);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const loginTitle = branding?.locked
    ? branding.communityName || branding.productName || t("Sign in")
    : t("Super Admin Login");
  const productLabel = branding?.productName ?? "Easy Life";

  return (
    <div className="mx-auto w-full max-w-[514px] px-6 font-[family-name:var(--font-poppins)] lg:ml-[30%] lg:px-0">
      {branding?.locked && branding.loginHeroSrc ? (
        <div className="mb-6 overflow-hidden rounded-2xl bg-[#0a0a0a] lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={branding.loginHeroSrc}
            alt=""
            className={
              branding.loginHeroSrc.includes("community-oceanside") ||
              branding.loginHeroSrc.includes("community-")
                ? "mx-auto h-36 w-auto max-w-full object-contain p-4"
                : "h-36 w-full object-cover"
            }
          />
        </div>
      ) : null}
      <h1 className="text-[28px] font-semibold leading-normal text-black">
        {loginTitle}
      </h1>
      {branding?.locked ? (
        <p className="mt-1 text-sm text-grey">{t("Sign in to continue")}</p>
      ) : (
        <p className="mt-1 text-sm text-grey">
          {t("Platform master access · oversee all communities")}
        </p>
      )}

      <form className="mt-8 space-y-[20px]" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {mfaToken ? (
          <>
            <p className="text-sm text-grey">
              {t(
                "Enter the 6-digit code from your authenticator app, or a recovery code.",
              )}
            </p>
            <input
              type="text"
              name="mfaCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("Authentication code")}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              required
              className={fieldClass}
            />
            <button
              type="button"
              className="text-sm text-[var(--mvp-blue)]"
              onClick={() => {
                setMfaToken(null);
                setMfaCode("");
                setError(null);
              }}
            >
              {t("Back to sign in")}
            </button>
          </>
        ) : (
          <>
            <input
              type="email"
              name="email"
              placeholder={t("Email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={fieldClass}
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder={t("Password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={`${fieldClass} pr-14`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[#bfbfbf]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </>
        )}
        {mfaToken ? null : (
          <Link
            href="/forgot-password"
            className="block text-[10px] font-normal text-[#007aff] hover:underline"
          >
            {t("Forgot Password?")}
          </Link>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={
            canSubmit
              ? "mt-5 flex h-[50px] w-full items-center justify-center rounded-lg bg-[#007aff] text-base font-medium text-white transition hover:opacity-95 disabled:opacity-60"
              : "mt-5 flex h-[50px] w-full cursor-not-allowed items-center justify-center rounded-lg bg-[#eee] text-base font-medium text-[#c4c4c4]"
          }
        >
          {loading
            ? t("Signing in...")
            : mfaToken
              ? t("Verify")
              : t("Login")}
        </button>
      </form>

      {!mfaToken ? <SsoButtons /> : null}

      {branding?.locked &&
      branding.tenantId === "oceansideresidents" &&
      !mfaToken ? (
        <p className="mt-5 text-center text-sm text-grey">
          New resident?{" "}
          <Link href="/register" className="font-semibold text-[#007aff] hover:underline">
            Register
          </Link>
          {" · "}
          Service provider?{" "}
          <Link href="/signup" className="font-semibold text-[#007aff] hover:underline">
            Create provider account
          </Link>
        </p>
      ) : null}

      {branding?.locked && branding.liveProduction ? null : branding?.locked ? (
        <>
          <p className="mt-6 text-center text-[14px] font-medium text-grey">
            {t("Demo access for")} {productLabel}
          </p>
          <DemoLoginCheatSheet
            productName={productLabel}
            logins={branding.demoLogins ?? []}
            onPickEmail={(next, nextPassword) => {
              setEmail(next);
              setPassword(nextPassword);
              setError(null);
            }}
          />
        </>
      ) : (
        <div className="mt-6 space-y-3 text-center text-[14px] font-medium text-black">
          <p>
            {t("Sales club demos")}{" "}
            <Link href="/go" className="text-[#007aff] hover:underline">
              /go
            </Link>
          </p>
          <p className="text-[13px] font-normal text-grey">
            {t("Password")}: <span className="font-semibold text-ink">password</span>
          </p>
        </div>
      )}
    </div>
  );
}

/** Figma Login View — https://www.figma.com/design/…?node-id=9750-8570 */
export default function LoginClient({
  branding,
}: {
  branding?: LoginBranding | null;
}) {
  const productName = branding?.productName ?? "Easy Life";
  const communityName = branding?.communityName ?? "";
  // Prefer tenant logo; avoid the stacked IronCrest PNG lockup when SVG is available.
  const wordmarkSrc = branding?.logoSrc
    ? branding.logoSrc.includes("community-ironcrest.png")
      ? brandAssets.communityIroncrestSvg
      : branding.logoSrc
    : null;
  const heroSrc = branding?.loginHeroSrc ?? brandAssets.loginHeroEasyLife;

  // Soft navigations between /go/[tenant] → /login can leave a stale tab title/favicon
  // from the previous club. Force both from the locked branding on every lock change.
  useEffect(() => {
    if (branding?.locked && branding.productName) {
      document.title = branding.communityName
        ? `${branding.productName} | ${branding.communityName}`
        : branding.productName;
      const tenant = getDemoTenantById(branding.tenantId);
      const iconHref = tenant
        ? tenantFaviconSrc(tenant)
        : branding.logoSrc;
      if (iconHref) {
        document
          .querySelectorAll(
            'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
          )
          .forEach((el) => el.remove());
        const bust = `${iconHref}?v=plaza-tab-3`;
        for (const rel of ["icon", "shortcut icon", "apple-touch-icon"] as const) {
          const link = document.createElement("link");
          link.rel = rel;
          link.href =
            rel === "apple-touch-icon"
              ? `${branding.logoSrc || iconHref}?v=plaza-tab-3`
              : bust;
          if (!bust.includes(".svg") && rel !== "apple-touch-icon") {
            link.type = "image/png";
          } else if (bust.includes(".svg") && rel !== "apple-touch-icon") {
            link.type = "image/svg+xml";
          }
          document.head.appendChild(link);
        }
      }
      return;
    }
    document.title = "Easy Life | Super Admin";
  }, [
    branding?.locked,
    branding?.productName,
    branding?.communityName,
    branding?.logoSrc,
    branding?.tenantId,
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-[family-name:var(--font-poppins)]">
      <header className="relative flex items-center justify-between border-b border-[#eee] px-6 py-5 lg:px-7">
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          {wordmarkSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wordmarkSrc}
              alt={productName}
              className="h-11 w-auto max-w-[min(100%,280px)] object-contain object-left sm:h-12"
            />
          ) : (
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brandAssets.logoIcon}
                alt=""
                className="h-9 w-9 rounded-md object-contain"
              />
              <p className="text-[22px] font-semibold tracking-[-0.02em] text-[#002856]">
                {productName}
              </p>
            </div>
          )}
          {communityName ? (
            <p className="text-[18px] font-semibold leading-tight tracking-[-0.01em] text-[#002856] sm:text-[20px]">
              {communityName}
            </p>
          ) : null}
        </div>
        <LanguageSwitcher />
      </header>

      <div className="relative flex flex-1 items-center overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-1/2 hidden -translate-x-[18%] -translate-y-1/2 lg:block">
          <LoginHero centerSrc={heroSrc} />
        </div>

        <Suspense fallback={null}>
          <LoginForm branding={branding ?? null} />
        </Suspense>
      </div>
    </div>
  );
}
