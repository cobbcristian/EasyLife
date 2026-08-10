"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  RESIDENTIAL_HOA_ACCOUNT_LINKS,
  UserAvatarMenu,
} from "@/components/layout/user-avatar-menu";
import { Logo } from "@/components/ui/logo";
import { ClubSwitcher } from "@/components/layout/club-switcher";
import { MemberSidebar } from "@/components/layout/member-sidebar";
import { MemberMvpBottomNav } from "@/components/member/member-mvp-bottom-nav";
import { avatarForReviewer, preferInitialsAvatar } from "@/lib/brand-assets";
import { communityIsResidentialHoa } from "@/lib/community-features";

export interface CommunityBranding {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  appDisplayName: string;
}

export function MemberShell({
  children,
  branding,
}: {
  children: React.ReactNode;
  branding: CommunityBranding | null;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [forceChromeless, setForceChromeless] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined);
  const pathname = usePathname();
  // Home embeds its own blue header + UserAvatarMenu; messages can force chromeless.
  // Every other member page uses the shared shell header so Log out is always available.
  const isMemberHome = pathname === "/member";
  const hideShellHeader = forceChromeless || isMemberHome;
  const accountLinks = communityIsResidentialHoa(branding?.id)
    ? RESIDENTIAL_HOA_ACCOUNT_LINKS
    : undefined;

  useEffect(() => {
    function openSidebar() {
      setSidebarOpen(true);
    }
    function onChromeless(e: Event) {
      const detail = (e as CustomEvent<{ chromeless?: boolean }>).detail;
      setForceChromeless(Boolean(detail?.chromeless));
    }
    window.addEventListener("member:open-sidebar", openSidebar);
    window.addEventListener("member:chromeless", onChromeless);
    return () => {
      window.removeEventListener("member:open-sidebar", openSidebar);
      window.removeEventListener("member:chromeless", onChromeless);
    };
  }, []);

  useEffect(() => {
    let on = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (!on) return;
        const name =
          typeof d.name === "string" && d.name.trim() ? d.name : "Member";
        setAccountName(name);
        setAccountEmail(typeof d.email === "string" ? d.email : "");
        if (preferInitialsAvatar(name, typeof d.email === "string" ? d.email : "")) {
          setAvatarSrc(undefined);
        } else if (typeof d.avatarUrl === "string" && d.avatarUrl) {
          setAvatarSrc(d.avatarUrl);
        } else {
          setAvatarSrc(avatarForReviewer(name));
        }
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  const brandStyle = branding?.primaryColor
    ? ({ ["--brand-primary" as string]: branding.primaryColor } as React.CSSProperties)
    : undefined;

  return (
    <div className="flex min-h-screen bg-white" style={brandStyle}>
      <MemberSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        appName={branding?.appDisplayName}
        logoUrl={branding?.logoUrl}
        userName={accountName}
        avatarSrc={avatarSrc}
        communityId={branding?.id}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {!hideShellHeader ? (
          <>
            <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 bg-white px-4 sm:px-6 lg:hidden">
              <button
                type="button"
                className="rounded-lg p-2 text-gray-2 hover:bg-slate-100"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Logo
                size="sm"
                productName={branding?.appDisplayName ?? "Easy Life"}
                communityLogoSrc={branding?.logoUrl}
                communityName={branding?.name}
                showCommunityName={false}
              />
              <ClubSwitcher className="ml-auto" compact />
              <UserAvatarMenu
                name={accountName}
                email={accountEmail}
                avatarSrc={avatarSrc}
                links={accountLinks}
              />
            </header>
            <div className="sticky top-0 z-30 hidden h-14 items-center justify-end gap-3 border-b border-border-2 bg-white px-8 lg:flex">
              <ClubSwitcher />
              <UserAvatarMenu
                name={accountName}
                email={accountEmail}
                avatarSrc={avatarSrc}
                links={accountLinks}
              />
            </div>
          </>
        ) : null}
        <main id="main-content" className="flex-1 pb-28 md:pb-0">
          {children}
        </main>
        {/* Always available on mobile so members can jump Home / Calendar / Messages from any page (including DM + Newsletter). */}
        <MemberMvpBottomNav />
      </div>
    </div>
  );
}
