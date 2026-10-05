import { describe, expect, it } from "vitest";

function heuristicRoute(message: string): string {
  const m = message.toLowerCase();
  if (/grab\s*(&|and)?\s*go|fridge|concession|rfid/.test(m)) return "grab_go";
  if (/eat[\s-]?in|dine|restaurant|order food|takeout/.test(m)) return "dining";
  if (/vendor|lesson|pro\b|coach|instructor/.test(m)) return "vendor";
  if (/book|court|tee|spa|pickle|reserve/.test(m)) return "booking";
  if (/age\s*out|dependent|junior|household/.test(m)) return "household";
  if (/rejoin|resign|waiting period/.test(m)) return "rejoin";
  return "fallback";
}

/**
 * Mirrors runClubAssistant priority: lesson/pro intent must win even when
 * amenity name tokens (tennis/golf/pickle) would also match a court.
 */
function clubAssistantRoute(
  message: string,
  amenityMatchCount: number,
): "vendor" | "amenity" | "fallback" {
  const m = message.toLowerCase();
  const askingHours =
    /\b(hours|open|close|closing|opening)\b/.test(m) &&
    !/\b(book|reserve|reservation)\b/.test(m);
  const lessonAsk =
    /vendor|pro\b|instructor|coach|lesson|private lesson|teaching pro/.test(m) ||
    (/book|reserve|schedule/.test(m) && /lesson|pro\b|coach/.test(m));
  if (lessonAsk) return "vendor";
  if (
    !askingHours &&
    (amenityMatchCount > 0 || /\b(book|reserve|reservation)\b/.test(m))
  ) {
    return "amenity";
  }
  return "fallback";
}

describe("assistant intent routing", () => {
  it("routes common club intents", () => {
    expect(heuristicRoute("I want eat-in at the restaurant")).toBe("dining");
    expect(heuristicRoute("book a tennis court Saturday")).toBe("booking");
    expect(heuristicRoute("book a lesson with a tennis pro")).toBe("vendor");
    expect(heuristicRoute("reserve a vendor for tomorrow")).toBe("vendor");
    expect(heuristicRoute("when do kids age out")).toBe("household");
    expect(heuristicRoute("grab and go unlock")).toBe("grab_go");
    expect(heuristicRoute("rejoin after resigning")).toBe("rejoin");
  });

  it("does not auto-reserve a court when the member asked for a lesson", () => {
    expect(clubAssistantRoute("Book a tennis lesson tomorrow at 10", 1)).toBe(
      "vendor",
    );
    expect(clubAssistantRoute("book a golf lesson with a pro", 2)).toBe("vendor");
    expect(clubAssistantRoute("book a tennis court tomorrow at 10", 1)).toBe(
      "amenity",
    );
  });
});
