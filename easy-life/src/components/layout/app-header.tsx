"use client";

import { Menu } from "lucide-react";
import { UserAvatarMenu } from "@/components/layout/user-avatar-menu";
import { Logo } from "@/components/ui/logo";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";

interface AppHeaderProps {
  onMenuClick: () => void;
  userName?: string;
  communityLogoSrc?: string | null;
  communityName?: string | null;
  productName?: string | null;
  homeHref?: string;
}

export function AppHeader({
  onMenuClick,
  userName = "Admin",
  communityLogoSrc,
  communityName,
  productName,
  homeHref = "/dashboard",
}: AppHeaderProps) {
  const profile = useSessionProfile();
  const isSuperAdmin = profile.role === "admin" && !profile.communityId;

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 bg-white px-4 sm:px-6 lg:hidden">
      <button
        type="button"
        className="rounded-lg p-2 text-gray-2 hover:bg-slate-100"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <UserAvatarMenu
        name={userName}
        align="left"
        homeHref={homeHref}
        trigger={
          <Logo
            size="sm"
            productName={productName}
            communityLogoSrc={communityLogoSrc}
            communityName={communityName}
            showCommunityName={false}
          />
        }
      />
      <UserAvatarMenu
        name={userName}
        avatarInitials={isSuperAdmin ? "SA" : undefined}
        className="ml-auto"
      />
    </header>
  );
}
