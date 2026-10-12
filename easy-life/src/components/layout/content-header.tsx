"use client";

import Link from "next/link";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { UserAvatarMenu } from "@/components/layout/user-avatar-menu";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ContentHeaderProps {
  title: string;
  backHref?: string;
  right?: "logo" | "avatar";
  avatarName?: string;
  avatarSrc?: string;
  /** Home target when the logo trigger opens the account menu (Managing Club / admin). */
  homeHref?: string;
  /** Figma provider avatar menu — e.g. href + "3 Tasks". */
  tasksHref?: string;
  tasksLabel?: string;
  /** Figma Admin Booking Management (5687:5540) — chat bubble next to avatar. */
  messagesHref?: string;
  className?: string;
  /** Set false for dynamic names (e.g. community names) that should not be translated */
  translateTitle?: boolean;
  /**
   * When false (default), hide on small screens — mobile shells already show a title.
   * Board/PM portal pages pass true so the page title is always visible.
   */
  showOnMobile?: boolean;
}

export function ContentHeader({
  title,
  backHref,
  right = "logo",
  avatarName,
  avatarSrc,
  homeHref = "/dashboard",
  tasksHref,
  tasksLabel,
  messagesHref,
  className,
  translateTitle = true,
  showOnMobile = false,
}: ContentHeaderProps) {
  const { t } = useI18n();
  const profile = useSessionProfile();
  const isSuperAdmin = profile.role === "admin" && !profile.communityId;
  const menuName =
    avatarName ??
    (profile.name && profile.name !== "Member" ? profile.name : "Admin");
  const useLogoTrigger = right === "logo" && !isSuperAdmin;

  return (
    <div
      className={cn(
        "h-[56px] items-center border-b border-border-2 bg-white px-4 sm:h-[64px] sm:px-6 lg:h-[72px] lg:px-8",
        showOnMobile ? "flex" : "hidden lg:flex",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {backHref ? (
          <Link
            href={backHref}
            className="rounded-md p-1 text-[var(--mvp-blue)] hover:bg-[#e8f4fc]"
            aria-label={t("Back")}
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
        ) : null}
        <h1 className="truncate text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {translateTitle ? t(title) : title}
        </h1>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        {messagesHref ? (
          <Link
            href={messagesHref}
            className="rounded-md p-1 text-grey hover:bg-[#f2f2f7] hover:text-black"
            aria-label={t("Messages")}
          >
            <MessageSquare className="h-5 w-5" />
          </Link>
        ) : null}
        {useLogoTrigger ? (
          <UserAvatarMenu
            name={menuName}
            avatarSrc={avatarSrc}
            homeHref={homeHref}
            tasksHref={tasksHref}
            tasksLabel={tasksLabel}
            trigger={<LogoMark size="md" />}
          />
        ) : (
          <UserAvatarMenu
            name={menuName}
            avatarSrc={avatarSrc}
            avatarInitials={isSuperAdmin ? "SA" : undefined}
            homeHref={isSuperAdmin ? homeHref : undefined}
            tasksHref={tasksHref}
            tasksLabel={tasksLabel}
          />
        )}
      </div>
    </div>
  );
}

export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8", className)}>
      {children}
    </div>
  );
}

/** Shared eyebrow + title row for Board / PM overview and section pages. */
export function PortalPageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--mvp-blue)]">{t(eyebrow)}</p>
        <h2 className="text-[21px] font-medium text-black">{t(title)}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-grey">{t(description)}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
