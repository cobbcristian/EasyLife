import { cookies } from "next/headers";
import { PortalShell } from "@/components/layout/portal-shell";
import { getSession } from "@/lib/server/auth";
import {
  ACTIVE_COMMUNITY_COOKIE,
  DEMO_TENANT_COOKIE,
  demoBrandFromCookies,
} from "@/lib/demo-branding";

const nav = [
  { label: "Home", href: "/board", icon: "LayoutDashboard" },
  { label: "Scheduler", href: "/board/scheduler", icon: "CalendarDays" },
  { label: "Governance", href: "/board/governance", icon: "Vote" },
  { label: "Budget", href: "/board/budget", icon: "PiggyBank" },
  { label: "Invoices", href: "/board/invoices", icon: "ReceiptText" },
  { label: "Announcements", href: "/board/announcements", icon: "Megaphone" },
  { label: "Invites", href: "/board/invites", icon: "Mail" },
  { label: "Documents", href: "/board/documents", icon: "FileText" },
  { label: "Reports", href: "/board/reports", icon: "BarChart3" },
  { label: "Message Board", href: "/board/messages", icon: "MessageSquare" },
];

export default async function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cookieStore, session] = await Promise.all([cookies(), getSession()]);
  const initialBrand = demoBrandFromCookies(
    cookieStore.get(DEMO_TENANT_COOKIE)?.value,
    cookieStore.get(ACTIVE_COMMUNITY_COOKIE)?.value,
  );

  return (
    <PortalShell
      navItems={nav}
      homeHref="/board"
      avatarName={session?.name?.trim() || "Board"}
      portalLabel="Board portal"
      initialBrand={initialBrand}
    >
      {children}
    </PortalShell>
  );
}
