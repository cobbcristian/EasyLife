export interface Match {
  id: string;
  p1: string | null;
  p2: string | null;
  winner: string | null;
}

export interface BracketRound {
  name: string;
  matches: Match[];
}

export interface ManagedTournament {
  id: string;
  title: string;
  sport: string;
  date: string;
  format: string;
  status: "registration" | "in_progress" | "completed";
  participants: number;
  rounds: BracketRound[];
}

export const managedTournaments: ManagedTournament[] = [
  {
    id: "mt1",
    title: "Summer Tennis Open",
    sport: "Tennis",
    date: "2026-07-11",
    format: "Single elimination",
    status: "in_progress",
    participants: 8,
    rounds: [
      {
        name: "Quarterfinals",
        matches: [
          { id: "qf1", p1: "L. Clarizio", p2: "G. Sherman", winner: "L. Clarizio" },
          { id: "qf2", p1: "M. Carter", p2: "E. Chen", winner: "E. Chen" },
          { id: "qf3", p1: "J. Graffagnino", p2: "B. Dawson", winner: "B. Dawson" },
          { id: "qf4", p1: "K. Carter", p2: "E. Bonfiglio", winner: "K. Carter" },
        ],
      },
      {
        name: "Semifinals",
        matches: [
          { id: "sf1", p1: "L. Clarizio", p2: "E. Chen", winner: null },
          { id: "sf2", p1: "B. Dawson", p2: "K. Carter", winner: null },
        ],
      },
      {
        name: "Final",
        matches: [{ id: "f1", p1: null, p2: null, winner: null }],
      },
    ],
  },
  {
    id: "mt2",
    title: "Member Golf Scramble",
    sport: "Golf",
    date: "2026-08-02",
    format: "Stroke play",
    status: "registration",
    participants: 18,
    rounds: [],
  },
];
