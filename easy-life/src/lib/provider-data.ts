import type { ServiceBookingStatus } from "@/lib/types";

export interface ProviderBooking {
  id: string;
  resident: string;
  community: string;
  service: string;
  date: string;
  time: string;
  status: ServiceBookingStatus;
  amount: number;
}

export interface ProviderMessage {
  id: string;
  from: string;
  community: string;
  preview: string;
  time: string;
  unread: boolean;
}

export const providerProfile = {
  businessName: "Club Services",
  category: "Cleaning",
  type: "service" as "service" | "activity",
  email: "provider.demo@example.com",
  phone: "",
  address: "",
};

export const providerBookings: ProviderBooking[] = [
  {
    id: "pb1",
    resident: "Mike Smith",
    community: "Club Community",
    service: "Full House Cleaning, Carpet Cleaning",
    date: "2026-06-03",
    time: "10:00 AM",
    status: "pending",
    amount: 250,
  },
  {
    id: "pb2",
    resident: "Tom Jones",
    community: "Club Community",
    service: "Full House Cleaning",
    date: "2026-06-03",
    time: "1:00 PM",
    status: "accepted",
    amount: 250,
  },
  {
    id: "pb3",
    resident: "Bill Reilly",
    community: "Club Community",
    service: "Carpet Cleaning",
    date: "2026-06-03",
    time: "4:00 PM",
    status: "accepted",
    amount: 150,
  },
  {
    id: "pb4",
    resident: "Frank Diller",
    community: "Club Community",
    service: "Full House Cleaning, Carpet Cleaning",
    date: "2026-06-03",
    time: "4:00 PM",
    status: "accepted",
    amount: 350,
  },
  {
    id: "pb5",
    resident: "Laura Bennett",
    community: "Club Community",
    service: "Carpet Cleaning",
    date: "2026-06-02",
    time: "12:00 PM",
    status: "cancelled",
    amount: 150,
  },
  {
    id: "pb6",
    resident: "Mike Smith",
    community: "Club Community",
    service: "Court 2",
    date: "2026-06-03",
    time: "10:00AM-12:00PM",
    status: "accepted",
    amount: 0,
  },
];

export const providerMessages: ProviderMessage[] = [
  {
    id: "pm1",
    from: "Club Member",
    community: "Club Community",
    preview: "Hi! Could we move the cleaning to the afternoon instead?",
    time: "10:24 AM",
    unread: true,
  },
  {
    id: "pm2",
    from: "Club Management",
    community: "Club Community",
    preview: "Reminder: gate access code changes next week.",
    time: "Yesterday",
    unread: true,
  },
  {
    id: "pm3",
    from: "Michael Carter",
    community: "Club Community",
    preview: "Thanks for the great work last time!",
    time: "Mon",
    unread: false,
  },
];

export const providerServices = [
  { id: "ps1", name: "Standard Cleaning", price: 90, duration: "2 hrs" },
  { id: "ps2", name: "Deep Cleaning", price: 120, duration: "3 hrs" },
  { id: "ps3", name: "Move-out Cleaning", price: 200, duration: "4 hrs" },
];

export interface ProviderPromo {
  id: string;
  title: string;
  type: "coupon" | "ppc";
  detail: string;
  status: "active" | "scheduled" | "ended";
  redemptions: number;
}

export const providerPromos: ProviderPromo[] = [
  { id: "pr1", title: "20% off first deep clean", type: "coupon", detail: "Code: FRESH20", status: "active", redemptions: 18 },
  { id: "pr2", title: "Summer move-out special", type: "coupon", detail: "Code: MOVE50", status: "scheduled", redemptions: 0 },
  { id: "pr3", title: "Featured listing â€” Club Community", type: "ppc", detail: "$1.20 / click Â· $200 budget", status: "active", redemptions: 142 },
];

export const providerCalendar = [
  { id: "pc1", title: "Deep Cleaning — Residence", date: "2026-06-26", time: "10:00 AM" },
  { id: "pc2", title: "Move-out Cleaning — Residence", date: "2026-06-28", time: "1:00 PM" },
  { id: "pc3", title: "Standard Cleaning — Residence", date: "2026-06-30", time: "9:00 AM" },
];

export const providerPayout = {
  bankConnected: false,
  feeSchedule: [
    { id: "fs1", service: "Standard Cleaning", rate: 90 },
    { id: "fs2", service: "Deep Cleaning", rate: 120 },
    { id: "fs3", service: "Move-out Cleaning", rate: 200 },
  ],
};
