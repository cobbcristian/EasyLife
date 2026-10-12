export interface AccessLogEntry {
  id: string;
  user: string;
  action: string;
  detail: string;
  date: string;
  time: string;
}

export const accessLogs: AccessLogEntry[] = [
  { id: "al1", user: "Member", action: "Login", detail: "Member portal", date: "2026-06-24", time: "9:02 AM" },
  { id: "al2", user: "Member", action: "Payment", detail: "Monthly dues", date: "2026-06-24", time: "9:05 AM" },
  { id: "al3", user: "James Rodriguez", action: "Vote", detail: "Reserve fund allocation", date: "2026-06-23", time: "4:40 PM" },
  { id: "al4", user: "Michael Thompson", action: "Check-in", detail: "Vendor: Greenscape Crew", date: "2026-06-23", time: "8:00 AM" },
  { id: "al5", user: "Emily Chen", action: "Booking", detail: "Clubhouse — Jul 12", date: "2026-06-22", time: "2:15 PM" },
  { id: "al6", user: "Admin", action: "Profile change", detail: "Updated community settings", date: "2026-06-21", time: "11:30 AM" },
];

export interface LedgerEntry {
  id: string;
  description: string;
  type: "revenue" | "commission" | "payout";
  amount: number;
  date: string;
}

export const ledger: LedgerEntry[] = [
  { id: "le1", description: "HOA dues collected", type: "revenue", amount: 48500, date: "2026-06-01" },
  { id: "le2", description: "Service booking revenue", type: "revenue", amount: 6240, date: "2026-06-15" },
  { id: "le3", description: "Platform commission (10%)", type: "commission", amount: 624, date: "2026-06-15" },
  { id: "le4", description: "Provider payouts", type: "payout", amount: 5616, date: "2026-06-16" },
  { id: "le5", description: "Amenity fees collected", type: "revenue", amount: 1820, date: "2026-06-18" },
];

export interface ContentTemplate {
  id: string;
  name: string;
  channel: "email" | "sms" | "push";
  subject: string;
}

export const contentTemplates: ContentTemplate[] = [
  { id: "ct1", name: "Welcome / onboarding", channel: "email", subject: "Welcome to your club!" },
  { id: "ct2", name: "Booking confirmation", channel: "email", subject: "Your booking is confirmed" },
  { id: "ct3", name: "Reservation reminder (3h)", channel: "sms", subject: "Reminder: your reservation is soon" },
  { id: "ct4", name: "Dues due notice", channel: "email", subject: "Your HOA dues are due" },
  { id: "ct5", name: "New announcement", channel: "push", subject: "New community announcement" },
];

export interface AdminNotification {
  id: string;
  title: string;
  detail: string;
  date: string;
  read: boolean;
}

export const adminNotifications: AdminNotification[] = [
  { id: "n1", title: "New provider invited", detail: "A new service provider joined your club", date: "2026-06-24", read: false },
  { id: "n2", title: "Invoice pending approval", detail: "Greenscape — $3,400", date: "2026-06-20", read: false },
  { id: "n3", title: "New community created", detail: "Willow Creek added", date: "2026-06-18", read: true },
];
