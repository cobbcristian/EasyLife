/** Plaza member theme — 3D Explore icons shared across member screens. */

export const plazaIcons = {
  reserve: "/brand/plaza-icon-reserve.png",
  pros: "/brand/plaza-icon-pros.png",
  outings: "/brand/plaza-icon-outings.png",
  info: "/brand/plaza-icon-info.png",
} as const;

export type PlazaIconKey = keyof typeof plazaIcons;

const hrefIcon: Array<{ test: (href: string) => boolean; icon: PlazaIconKey }> = [
  { test: (h) => h.startsWith("/member/bookings") || h.startsWith("/member/amenities"), icon: "reserve" },
  {
    test: (h) =>
      h.startsWith("/member/local-pros") ||
      h.startsWith("/member/service-requests") ||
      h.startsWith("/member/vendors"),
    icon: "pros",
  },
  {
    test: (h) =>
      h.startsWith("/member/calendar") ||
      h.startsWith("/member/hours") ||
      h.startsWith("/member/activities") ||
      h.startsWith("/member/events"),
    icon: "outings",
  },
  {
    test: (h) =>
      h.startsWith("/member/faq") ||
      h.startsWith("/member/assistant") ||
      h.startsWith("/member/contact") ||
      h.startsWith("/member/documents"),
    icon: "info",
  },
];

export function plazaIconForHref(href: string): PlazaIconKey | null {
  return hrefIcon.find((row) => row.test(href))?.icon ?? null;
}

const titles: Array<{ test: (path: string) => boolean; title: string }> = [
  { test: (p) => p.startsWith("/member/bookings"), title: "Reserve" },
  { test: (p) => p.startsWith("/member/amenities"), title: "Reserve" },
  { test: (p) => p.startsWith("/member/local-pros"), title: "Pros" },
  { test: (p) => p.startsWith("/member/service-requests"), title: "Pros" },
  { test: (p) => p.startsWith("/member/vendors"), title: "Pros" },
  { test: (p) => p.startsWith("/member/calendar"), title: "Outings" },
  { test: (p) => p.startsWith("/member/hours"), title: "Outings" },
  { test: (p) => p.startsWith("/member/activities"), title: "Outings" },
  { test: (p) => p.startsWith("/member/events"), title: "Outings" },
  { test: (p) => p.startsWith("/member/faq"), title: "Info" },
  { test: (p) => p.startsWith("/member/assistant"), title: "Info" },
  { test: (p) => p.startsWith("/member/contact"), title: "Info" },
  { test: (p) => p.startsWith("/member/payments"), title: "Payments" },
  { test: (p) => p.startsWith("/member/messages"), title: "Messages" },
  { test: (p) => p.startsWith("/member/packages"), title: "Packages" },
  { test: (p) => p.startsWith("/member/rentals"), title: "Rentals" },
  { test: (p) => p.startsWith("/member/profile"), title: "Profile" },
  { test: (p) => p.startsWith("/member/notifications"), title: "Notifications" },
  { test: (p) => p.startsWith("/member/visitors"), title: "Visitors" },
  { test: (p) => p.startsWith("/member/dining"), title: "Dining" },
  { test: (p) => p.startsWith("/member/documents"), title: "Info" },
  { test: (p) => p.startsWith("/member/directory"), title: "Directory" },
  { test: (p) => p.startsWith("/member/marketplace"), title: "Marketplace" },
  { test: (p) => p.startsWith("/member/waitlist"), title: "Waitlist" },
  { test: (p) => p.startsWith("/member/check-in"), title: "Check in" },
  { test: (p) => p.startsWith("/member/fundraising"), title: "Fundraising" },
];

export function plazaTitleForPath(pathname: string): string | null {
  return titles.find((row) => row.test(pathname))?.title ?? null;
}

export function PlazaGlyph({
  name,
  className = "h-[72px] w-[72px]",
}: {
  name: PlazaIconKey;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={plazaIcons[name]}
      alt=""
      className={`${className} rounded-full bg-[#f2f3f5] object-cover shadow-sm`}
    />
  );
}
