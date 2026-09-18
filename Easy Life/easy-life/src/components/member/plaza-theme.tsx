/** Plaza member theme — 3D icons shared across member screens. */

export const plazaIcons = {
  reserve: "/brand/plaza-icon-reserve.png",
  pros: "/brand/plaza-icon-pros.png",
  outings: "/brand/plaza-icon-outings.png",
  info: "/brand/plaza-icon-info.png",
  home: "/brand/plaza-icon-home.png",
  messages: "/brand/plaza-icon-messages.png",
  more: "/brand/plaza-icon-more.png",
  payments: "/brand/plaza-icon-payments.png",
  packages: "/brand/plaza-icon-packages.png",
  dining: "/brand/plaza-icon-dining.png",
  profile: "/brand/plaza-icon-profile.png",
  bell: "/brand/plaza-icon-bell.png",
  people: "/brand/plaza-icon-people.png",
  rewards: "/brand/plaza-icon-rewards.png",
  bag: "/brand/plaza-icon-bag.png",
  gallery: "/brand/plaza-icon-gallery.png",
  shirt: "/brand/plaza-icon-shirt.png",
  tram: "/brand/plaza-icon-tram.png",
  trophy: "/brand/plaza-icon-trophy.png",
  building: "/brand/plaza-icon-building.png",
  heart: "/brand/plaza-icon-heart.png",
  star: "/brand/plaza-icon-star.png",
  megaphone: "/brand/plaza-icon-megaphone.png",
  alert: "/brand/plaza-icon-alert.png",
  clock: "/brand/plaza-icon-clock.png",
  jetski: "/brand/plaza-icon-jetski.png",
} as const;

export type PlazaIconKey = keyof typeof plazaIcons;

const hrefIcon: Array<{ test: (href: string) => boolean; icon: PlazaIconKey }> = [
  { test: (h) => h === "/member" || h === "/member/", icon: "home" },
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
      h.startsWith("/member/activities") ||
      h.startsWith("/member/events"),
    icon: "outings",
  },
  { test: (h) => h.startsWith("/member/hours") || h.startsWith("/member/waitlist"), icon: "clock" },
  { test: (h) => h.startsWith("/member/check-in"), icon: "outings" },
  {
    test: (h) =>
      h.startsWith("/member/faq") ||
      h.startsWith("/member/assistant") ||
      h.startsWith("/member/contact") ||
      h.startsWith("/member/documents") ||
      h.startsWith("/member/blog"),
    icon: "info",
  },
  { test: (h) => h.startsWith("/member/messages"), icon: "messages" },
  { test: (h) => h.startsWith("/member/payments"), icon: "payments" },
  { test: (h) => h.startsWith("/member/packages"), icon: "packages" },
  { test: (h) => h.startsWith("/member/dining"), icon: "dining" },
  { test: (h) => h.startsWith("/member/profile"), icon: "profile" },
  { test: (h) => h.startsWith("/member/membership"), icon: "rewards" },
  { test: (h) => h.startsWith("/member/notifications"), icon: "bell" },
  {
    test: (h) =>
      h.startsWith("/member/visitors") ||
      h.startsWith("/member/household") ||
      h.startsWith("/member/groups") ||
      h.startsWith("/member/directory"),
    icon: "people",
  },
  { test: (h) => h.startsWith("/member/favorites"), icon: "star" },
  {
    test: (h) => h.startsWith("/member/announcements") || h.startsWith("/member/newsletter"),
    icon: "megaphone",
  },
  { test: (h) => h.startsWith("/member/tram"), icon: "tram" },
  { test: (h) => h.startsWith("/member/violations"), icon: "alert" },
  { test: (h) => h.startsWith("/member/fundraising"), icon: "heart" },
  {
    test: (h) => h.startsWith("/member/grab-go") || h.startsWith("/member/marketplace"),
    icon: "bag",
  },
  { test: (h) => h.startsWith("/member/tournaments"), icon: "trophy" },
  { test: (h) => h.startsWith("/member/apparel"), icon: "shirt" },
  { test: (h) => h.startsWith("/member/rentals"), icon: "jetski" },
  { test: (h) => h.startsWith("/member/rewards"), icon: "rewards" },
  { test: (h) => h.startsWith("/member/gallery"), icon: "gallery" },
  {
    test: (h) => h.startsWith("/member/properties") || h.startsWith("/member/real-estate"),
    icon: "building",
  },
];

export function plazaIconForHref(href: string): PlazaIconKey {
  return hrefIcon.find((row) => row.test(href))?.icon ?? "more";
}

const titles: Array<{ test: (path: string) => boolean; title: string }> = [
  { test: (p) => p.startsWith("/member/bookings"), title: "Reserve" },
  { test: (p) => p.startsWith("/member/amenities"), title: "Reserve" },
  { test: (p) => p.startsWith("/member/local-pros"), title: "Pros" },
  { test: (p) => p.startsWith("/member/service-requests"), title: "Pros" },
  { test: (p) => p.startsWith("/member/vendors"), title: "Pros" },
  { test: (p) => p.startsWith("/member/calendar"), title: "Outings" },
  { test: (p) => p.startsWith("/member/hours"), title: "Hours" },
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
