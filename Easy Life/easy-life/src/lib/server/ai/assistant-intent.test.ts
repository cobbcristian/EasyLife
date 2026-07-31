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
});
