export type SalesClub = {
  id: string;
  name: string;
  eyebrow: string;
  accent: string;
  heroGradient: string;
  loginEmail: string;
  unit: string;
  greeting: string;
  subline: string;
};

export const SALES_CLUBS: SalesClub[] = [
  {
    id: "oceanside",
    name: "The Plaza at Oceanside",
    eyebrow: "Oceanside · Unit 12B",
    accent: "#c4a35a",
    heroGradient:
      "linear-gradient(165deg, #73b8d4 0%, #0c5a6e 42%, #031a28 100%)",
    loginEmail: "resident@oceansideresidents.com",
    unit: "12B",
    greeting: "Good afternoon, Alex",
    subline: "Theater in 40 min · package ready · $420 due",
  },
  {
    id: "ironcrest",
    name: "IronCrest Golf & Country",
    eyebrow: "IronCrest · Member",
    accent: "#8c7348",
    heroGradient:
      "linear-gradient(165deg, #5a5248 0%, #2a2620 55%, #141210 100%)",
    loginEmail: "member@ironcrest.demo",
    unit: "Member",
    greeting: "Good afternoon, Sarah",
    subline: "Tee time at 2:30 · pro shop order ready",
  },
  {
    id: "goldenocala",
    name: "Golden Ocala",
    eyebrow: "Golden Ocala · Unit 204B",
    accent: "#c8a648",
    heroGradient:
      "linear-gradient(165deg, #3d7a4a 0%, #1a4a2a 55%, #0f2818 100%)",
    loginEmail: "sarah.mitchell@oceanside.com",
    unit: "204B",
    greeting: "Good afternoon, Sarah",
    subline: "Court booked · mixer tonight · dues current",
  },
];

export function getSalesClub(id: string): SalesClub {
  return SALES_CLUBS.find((c) => c.id === id) ?? SALES_CLUBS[0];
}
