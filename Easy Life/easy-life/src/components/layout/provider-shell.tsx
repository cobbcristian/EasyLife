"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { UserAvatarMenu } from "@/components/layout/user-avatar-menu";
import { Logo } from "@/components/ui/logo";
import { ProviderSidebar } from "@/components/layout/provider-sidebar";
import { defaultAvatarForRole } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export function ProviderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>();
  const [displayName, setDisplayName] = useState("");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);
  // Figma Service Vendor Main is chromeless on mobile
  const hideMobileChrome = pathname === "/provider";

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.name) setDisplayName(d.name);
        if (d.logoUrl) setBrandLogo(d.logoUrl);
        if (d.appDisplayName) setBrandName(d.appDisplayName);
        setAvatarSrc(
          defaultAvatarForRole(d.role ?? "provider", d.avatarUrl, d.name, d.email),
        );
      })
      .catch(() => {
        setAvatarSrc(defaultAvatarForRole("provider", null));
      });
  }, []);

  return (
    <div className="flex min-h-screen bg-white">
      <ProviderSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-30 flex h-[72px] items-center gap-4 bg-white px-4 sm:px-6 lg:hidden",
            hideMobileChrome && "hidden",
          )}
        >
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
            communityLogoSrc={brandLogo}
            productName={brandName}
            showText={!brandLogo}
          />
          <UserAvatarMenu name={displayName} avatarSrc={avatarSrc} className="ml-auto" />
        </header>
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
