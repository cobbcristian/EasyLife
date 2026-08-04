/** Figma sidebar icon set (stroke icons under /brand/icons). */
export type NavIconKey = "dashboard" | "calendar" | "briefcase" | "envelope" | "userCircle";

export const navIconPaths: Record<NavIconKey, string> = {
  dashboard: "/brand/icons/nav-dashboard.svg",
  calendar: "/brand/icons/nav-calendar.svg",
  briefcase: "/brand/icons/nav-briefcase.svg",
  envelope: "/brand/icons/nav-envelope.svg",
  userCircle: "/brand/icons/nav-user-circle.svg",
};

/** Map legacy Lucide icon component names to the Figma nav icon set. */
export const lucideToNavIcon: Record<string, NavIconKey> = {
  LayoutDashboard: "dashboard",
  Home: "dashboard",
  BarChart3: "dashboard",
  CalendarCheck: "calendar",
  CalendarDays: "calendar",
  ClipboardList: "calendar",
  Trophy: "calendar",
  Building2: "briefcase",
  Briefcase: "briefcase",
  ListChecks: "briefcase",
  Dumbbell: "briefcase",
  Store: "briefcase",
  ShoppingBag: "briefcase",
  Shirt: "briefcase",
  Bike: "briefcase",
  Users: "briefcase",
  UserPlus: "briefcase",
  UsersRound: "briefcase",
  Sparkles: "briefcase",
  Wrench: "briefcase",
  Utensils: "briefcase",
  UtensilsCrossed: "briefcase",
  CreditCard: "briefcase",
  Vote: "briefcase",
  DoorOpen: "briefcase",
  PiggyBank: "briefcase",
  Star: "envelope",
  Megaphone: "envelope",
  MessageCircle: "envelope",
  Mail: "envelope",
  FileText: "envelope",
  Newspaper: "envelope",
  Image: "envelope",
  ReceiptText: "envelope",
  Receipt: "envelope",
  Award: "envelope",
  Tag: "envelope",
  Bell: "envelope",
  ScrollText: "envelope",
  MessageSquare: "envelope",
  Gift: "envelope",
  PenLine: "envelope",
  List: "calendar",
  Search: "dashboard",
  Shield: "userCircle",
  ShieldCheck: "userCircle",
  UserCircle: "userCircle",
  UserCheck: "userCircle",
};

export function navIconForLucide(name: string): NavIconKey {
  return lucideToNavIcon[name] ?? "briefcase";
}
