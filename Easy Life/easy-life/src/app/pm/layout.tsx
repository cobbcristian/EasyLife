import { cookies } from "next/headers";
import { PortalShell } from "@/components/layout/portal-shell";
import { getSession } from "@/lib/server/auth";
import {
  ACTIVE_COMMUNITY_COOKIE,
  DEMO_TENANT_COOKIE,
  demoBrandFromCookies,
} from "@/lib/demo-branding";
import {
  communityHasClubDining,
  communityHasGuestFees,
  communityHasTramService,
} from "@/lib/community-features";

const nav = [
  { label: "Home", href: "/pm", icon: "LayoutDashboard" },
  { label: "Front Desk", href: "/pm/front-desk", icon: "DoorOpen" },
  { label: "Member bookings", href: "/pm/bookings", icon: "CalendarCheck" },
  { label: "Tram Dispatch", href: "/pm/tram", icon: "Bus" },
  { label: "Packages", href: "/pm/packages", icon: "Package" },
  { label: "Violations", href: "/pm/violations", icon: "AlertTriangle" },
  { label: "Registrations", href: "/pm/registrations", icon: "ClipboardList" },
  { label: "Maintenance", href: "/pm/maintenance", icon: "Wrench" },
  { label: "Announcements", href: "/pm/announcements", icon: "Megaphone" },
  { label: "Events", href: "/pm/events", icon: "CalendarDays" },
  { label: "Dining", href: "/pm/dining", icon: "UtensilsCrossed" },
  { label: "Member approvals", href: "/pm/member-approvals", icon: "UserCheck" },
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
  const communityId =
    session?.communityId ??
    cookieStore.get(ACTIVE_COMMUNITY_COOKIE)?.value ??
    null;
  const hideDining = !communityHasClubDining(communityId);
  const hideGuestFees = !communityHasGuestFees(communityId);
  const hideTram = !communityHasTramService(communityId);
  const navItems = nav.filter((item) => {
    if (hideDining && item.href === "/pm/dining") return false;
    if (hideGuestFees && item.href === "/pm/guest-fees") return false;
    if (hideTram && item.href === "/pm/tram") return false;
    return true;
  });

  return (
    <PortalShell
      navItems={navItems}
      homeHref="/pm"
      avatarName={session?.name?.trim() || "Property Manager"}
      portalLabel="Property manager"
      initialBrand={initialBrand}
    >
      {children}
    </PortalShell>
  );
}
