export const pmProfile = {
  name: "Property Manager",
  email: "pm.demo@example.com",
  role: "Property Manager",
  community: "Your Club",
};

export interface CheckinEntry {
  id: string;
  name: string;
  type: "guest" | "vendor";
  host: string;
  unit: string;
  time: string;
  status: "expected" | "checked_in" | "checked_out";
}

export const checkins: CheckinEntry[] = [
  { id: "ci1", name: "Landscape Crew", type: "vendor", host: "Management", unit: "Common", time: "8:00 AM", status: "checked_in" },
  { id: "ci2", name: "Guest Arrival", type: "guest", host: "Member", unit: "Lot 12", time: "2:00 PM", status: "expected" },
  { id: "ci3", name: "Package Delivery", type: "vendor", host: "Front Desk", unit: "Lobby", time: "11:30 AM", status: "checked_out" },
];

export interface Registration {
  id: string;
  resident: string;
  unit: string;
  vehicle: boolean;
  pet: boolean;
  fingerprint: boolean;
}

export const registrations: Registration[] = [
  { id: "rg1", resident: "Member", unit: "Lot 12", vehicle: true, pet: true, fingerprint: false },
  { id: "rg2", resident: "Emily Chen", unit: "305C", vehicle: true, pet: true, fingerprint: true },
  { id: "rg3", resident: "Greg Sherman", unit: "210A", vehicle: false, pet: false, fingerprint: false },
];

export interface MaintenanceTask {
  id: string;
  title: string;
  area: string;
  assignedTo: string;
  status: "open" | "in_progress" | "done";
  due: string;
}

export const maintenanceTasks: MaintenanceTask[] = [
  { id: "mt1", title: "Replace lobby light fixtures", area: "Lobby", assignedTo: "J. Alvarez", status: "in_progress", due: "2026-06-26" },
  { id: "mt2", title: "Pool pump inspection", area: "Pool", assignedTo: "BlueWave", status: "open", due: "2026-06-28" },
  { id: "mt3", title: "Gate motor lubrication", area: "Entrance", assignedTo: "J. Alvarez", status: "done", due: "2026-06-18" },
  { id: "mt4", title: "Member request: faucet leak", area: "Residence", assignedTo: "Unassigned", status: "open", due: "2026-06-27" },
];

export interface PmDocument {
  id: string;
  title: string;
  category: "rules" | "policy" | "emergency";
  date: string;
}

export const pmDocuments: PmDocument[] = [
  { id: "pd1", title: "Community Rules", category: "rules", date: "2026-01-15" },
  { id: "pd2", title: "Vendor Access Policy", category: "policy", date: "2026-03-01" },
  { id: "pd3", title: "Emergency Contacts", category: "emergency", date: "2026-02-10" },
];
