"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Home, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type AccountMenuLink = {
  label: string;
  href: string;
};

/** Plaza-style account menu for condo / residential HOA members. */
export const RESIDENTIAL_HOA_ACCOUNT_LINKS: AccountMenuLink[] = [
  { label: "My Profile", href: "/member/profile" },
  { label: "Pay HOA dues", href: "/member/payments" },
  { label: "Notifications", href: "/member/notifications" },
  { label: "Reservations", href: "/member/bookings" },
  { label: "Messages", href: "/member/messages" },
  { label: "Visitor", href: "/member/visitors" },
];

export function UserAvatarMenu({
  name,
  email,
  avatarSrc,
  avatarInitials,
  className,
  trigger,
  align = "right",
  homeHref,
  tasksHref,
  tasksLabel,
  links,
}: {
  name: string;
  email?: string;
  avatarSrc?: string;
  /** Override avatar initials (e.g. "SA" for super admin). */
  avatarInitials?: string;
  className?: string;
  /** Custom open control (e.g. sidebar logos). Defaults to avatar. */
  trigger?: ReactNode;
  align?: "left" | "right";
  /** When set, menu includes a Home link (for logo triggers that no longer navigate alone). */
  homeHref?: string;
  /** Figma Service Dashboard logout hover — e.g. "3 Tasks". */
  tasksHref?: string;
  tasksLabel?: string;
  /** Extra account links (e.g. Plaza resident menu). Shown above Log out. */
  links?: AccountMenuLink[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const hasAccountLinks = Boolean(links?.length);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function logout() {
    setOpen(false);
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const data = (await res.json().catch(() => null)) as {
      redirectTo?: string;
    } | null;
    // Prefer club /go lock so sales demos keep branding; fall back to /login.
    window.location.href = data?.redirectTo || "/login";
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]",
          trigger && "rounded-lg text-left",
        )}
        aria-label={t("Account menu")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {trigger ?? (
          <Avatar name={name} src={avatarSrc} initials={avatarInitials} size="sm" />
        )}
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-2 overflow-hidden rounded-lg border border-border-2 bg-white py-1 shadow-lg",
            hasAccountLinks ? "min-w-[220px]" : "min-w-[168px]",
            align === "left" ? "left-0" : "right-0",
          )}
        >
          {hasAccountLinks ? (
            <div className="flex items-center gap-3 border-b border-border-2 px-3 py-3">
              <Avatar name={name} src={avatarSrc} initials={avatarInitials} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{name}</p>
                {email ? (
                  <p className="truncate text-xs text-grey">{email}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="truncate border-b border-border-2 px-3 py-2 text-xs text-grey">
              {name}
            </p>
          )}
          {homeHref && !hasAccountLinks ? (
            <Link
              href={homeHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-slate-50"
            >
              <Home className="h-4 w-4 text-grey" />
              {t("Home")}
            </Link>
          ) : null}
          {links?.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full px-3 py-2.5 text-sm text-ink hover:bg-slate-50"
            >
              {t(item.label)}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50",
              hasAccountLinks
                ? "text-ink"
                : "font-medium text-[#ff3b30] hover:bg-[#fdecea]",
            )}
          >
            {hasAccountLinks ? null : <LogOut className="h-4 w-4" />}
            {t("Log out")}
          </button>
          {tasksHref && tasksLabel ? (
            <Link
              href={tasksHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-[var(--mvp-blue)] hover:bg-[#e8f4fc]"
            >
              {tasksLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
