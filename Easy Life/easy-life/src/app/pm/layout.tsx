import { cookies } from "next/headers";
import { PortalShell } from "@/components/layout/portal-shell";
import { getSession } from "@/lib/server/auth";
import {
  ACTIVE_COMMUNITY_COOKIE,
  DEMO_TENANT_COOKIE,
  demoBrandFromCookies,
} from "@/lib/demo-branding";

const nav = [
  { label: "Home", href: "/pm", icon: "LayoutDashboard" },
  { label: "Front Desk", href: "/pm/front-desk", icon: "DoorOpen" },
  { label: "Packages", href: "/pm/packages", icon: "Package" },
  { label: "Violations", href: "/pm/violations", icon: "AlertTriangle" },
  { label: "Registrations", href: "/pm/registrations", icon: "ClipboardList" },
  { label: "Maintenance", href: "/pm/maintenance", icon: "Wrench" },
  { label: "Announcements", href: "/pm/announcements", icon: "Megaphone" },
  { label: "Events", href: "/pm/events", icon: "CalendarDays" },
  { label: "Dining", href: "/pm/dining", icon: "UtensilsCrossed" },
  { label: "Invites", href: "/pm/invites", icon: "Mail" },
  { label: "Documents", href: "/pm/documents", icon: "FileText" },
  { label: "Knowledge Base", href: "/pm/knowledge", icon: "HelpCircle" },
  { label: "Invoices", href: "/pm/invoices", icon: "ReceiptText" },
  { label: "Guest fees", href: "/pm/guest-fees", icon: "ReceiptText" },
  { label: "Reports", href: "/pm/reports", icon: "BarChart3" },
  { label: "Board Messages", href: "/pm/messages", icon: "MessageSquare" },
];

export default async function PmLayout({
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
      homeHref="/pm"
      avatarName={session?.name?.trim() || "Property Manager"}
      portalLabel="Property manager"
      initialBrand={initialBrand}
    >
      {children}
    </PortalShell>
  );
}
