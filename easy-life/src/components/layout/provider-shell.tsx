"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ProviderSidebar } from "@/components/layout/provider-sidebar";
import { PlazaPhoneChrome } from "@/components/layout/plaza-phone-chrome";
import { defaultAvatarForRole } from "@/lib/brand-assets";
import type { PlazaIconKey } from "@/components/member/plaza-theme";

export function ProviderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>();
  const [displayName, setDisplayName] = useState("");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);

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

  const title =
    pathname === "/provider"
      ? "Home"
      : pathname.includes("/bookings")
        ? "Bookings"
        : pathname.includes("/messages")
          ? "Messages"
          : pathname.includes("/services")
            ? "Services"
            : pathname.includes("/account")
              ? "Account"
              : "Provider";
  const icon: PlazaIconKey =
    title === "Bookings"
      ? "reserve"
      : title === "Messages"
        ? "messages"
        : title === "Account"
          ? "profile"
          : title === "Services"
            ? "pros"
            : "home";

  return (
    <div className="flex min-h-screen bg-white font-[family-name:var(--font-poppins)]">
      <ProviderSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <PlazaPhoneChrome
        productName={brandName || "Easy Life"}
        logoUrl={brandLogo}
        accountName={displayName || "Provider"}
        avatarSrc={avatarSrc}
        homeHref="/provider"
        title={title}
        icon={icon}
        onOpenMenu={() => setSidebarOpen(true)}
        tabs={[
          { href: "/provider", label: "Home", icon: "home", exact: true },
          { href: "/provider/bookings", label: "Bookings", icon: "reserve" },
          { href: "/provider/messages", label: "Messages", icon: "messages" },
        ]}
      >
        {children}
      </PlazaPhoneChrome>
    </div>
  );
}
