export const boardProfile = {
  name: "Board Member",
  email: "board.demo@example.com",
  role: "Board Advisor",
  community: "Your Club",
};

export interface BoardEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
}

export const boardSchedule: BoardEvent[] = [
  { id: "be1", title: "Monthly Board Meeting", date: "2026-06-25", time: "6:00 PM", location: "Room A", attendees: 7 },
  { id: "be2", title: "Budget Workshop", date: "2026-07-02", time: "5:30 PM", location: "Conference Room", attendees: 5 },
  { id: "be3", title: "Reserve Study Review", date: "2026-07-09", time: "6:00 PM", location: "Room A", attendees: 7 },
];

export interface Survey {
  id: string;
  title: string;
  description: string;
  status: "open" | "closed";
  responses: number;
  closes: string;
  options: { label: string; votes: number }[];
}

export const surveys: Survey[] = [
  {
    id: "s1",
    title: "Reserve fund allocation for 2027",
    description: "Vote on the proposed reserve contribution increase.",
    status: "open",
    responses: 86,
    closes: "2026-07-15",
    options: [
      { label: "Approve 3% increase", votes: 52 },
      { label: "Approve 5% increase", votes: 21 },
      { label: "No increase", votes: 13 },
    ],
  },
  {
    id: "s2",
    title: "New pool hours",
    description: "Should the pool stay open until 11pm in summer?",
    status: "open",
    responses: 64,
    closes: "2026-07-08",
    options: [
      { label: "Yes, extend hours", votes: 41 },
      { label: "No, keep current", votes: 23 },
    ],
  },
  {
    id: "s3",
    title: "Landscaping vendor selection",
    description: "Closed — Greenscape selected.",
    status: "closed",
    responses: 7,
    closes: "2026-05-30",
    options: [
      { label: "Greenscape", votes: 5 },
      { label: "GreenThumb Co.", votes: 2 },
    ],
  },
];

export interface Bid {
  id: string;
  project: string;
  vendor: string;
  amount: number;
  status: "received" | "under_review" | "accepted" | "rejected";
  date: string;
}

export const bids: Bid[] = [
  { id: "bid1", project: "Roof replacement — Bldg C", vendor: "Apex Roofing", amount: 48500, status: "under_review", date: "2026-06-18" },
  { id: "bid2", project: "Roof replacement — Bldg C", vendor: "SureTop Inc.", amount: 52900, status: "received", date: "2026-06-20" },
  { id: "bid3", project: "Lobby renovation", vendor: "Modern Interiors", amount: 31200, status: "accepted", date: "2026-05-30" },
];

export interface BudgetLine {
  id: string;
  category: string;
  budgeted: number;
  spent: number;
}

export const budgetLines: BudgetLine[] = [
  { id: "bl1", category: "Landscaping", budgeted: 84000, spent: 41200 },
  { id: "bl2", category: "Pool & Amenities", budgeted: 36000, spent: 19800 },
  { id: "bl3", category: "Insurance", budgeted: 120000, spent: 120000 },
  { id: "bl4", category: "Reserves", budgeted: 95000, spent: 30000 },
  { id: "bl5", category: "Utilities", budgeted: 52000, spent: 28400 },
];

export interface Invoice {
  id: string;
  vendor: string;
  description: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  date: string;
}

export const invoices: Invoice[] = [
  { id: "inv1", vendor: "Greenscape Lawn Care", description: "June landscaping", amount: 3400, status: "pending", date: "2026-06-20" },
  { id: "inv2", vendor: "BlueWave Pool Service", description: "Pool maintenance Q2", amount: 2100, status: "pending", date: "2026-06-19" },
  { id: "inv3", vendor: "Apex Roofing", description: "Bldg A repairs", amount: 8750, status: "approved", date: "2026-06-10" },
];

export interface BoardMessage {
  id: string;
  author: string;
  body: string;
  time: string;
}

export const boardMessages: BoardMessage[] = [
  { id: "bm1", author: "Rachel Clouse", body: "Can we finalize the roofing vendor before the next meeting?", time: "Mon 4:12 PM" },
  { id: "bm2", author: "James Rodriguez", body: "Yes — let's review both bids Thursday.", time: "Mon 4:30 PM" },
  { id: "bm3", author: "Simon Ferguson", body: "I'll prepare the reserve study summary.", time: "Tue 9:05 AM" },
];
