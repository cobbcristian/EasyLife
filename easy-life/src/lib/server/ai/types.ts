export type AiAction =
  | { type: "open"; label: string; href: string }
  | {
      type: "prefill_dining";
      label: string;
      restaurant?: string;
      fulfillment?: "eat_in" | "takeout" | "delivery";
    }
  | {
      type: "suggest_booking";
      label: string;
      amenityHint?: string;
      date?: string;
      time?: string;
    }
  | {
      type: "book_amenity";
      label: string;
      amenityId: string;
      amenityName: string;
      date: string;
      startTime: string;
      endTime: string;
    }
  | {
      type: "book_vendor";
      label: string;
      providerId: string;
      providerName: string;
      sport: "tennis" | "golf" | "pickleball";
      date: string;
      startTime: string;
      durationMinutes?: number;
    }
  | {
      type: "booked";
      label: string;
      href: string;
      summary: string;
    };

export type InsightScore = {
  id: string;
  title: string;
  score: number;
  level: "low" | "medium" | "high";
  reason: string;
  href?: string;
};

export type InsightBundle = {
  forYou: InsightScore[];
  churnRisk: InsightScore;
  tierFit: InsightScore;
  fbSuggestions: string[];
  noShowRisk: InsightScore;
  demandHeat: Array<{ label: string; hour: number; count: number }>;
  partnerMatches: Array<{ name: string; email?: string | null; reason: string }>;
  householdAlerts: InsightScore[];
  generatedAt: string;
  provider: "heuristic" | "openai";
};

export type ModerationResult = {
  allowed: boolean;
  flagged: boolean;
  reasons: string[];
  provider: "heuristic" | "openai";
};

export type AssistantReply = {
  reply: string;
  actions: AiAction[];
  provider: "heuristic" | "openai";
  /** When true, client should speak the reply aloud (voice mode / booking confirm). */
  speak?: boolean;
};

export function scoreLevel(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}
