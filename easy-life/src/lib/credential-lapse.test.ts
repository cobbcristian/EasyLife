import { describe, expect, it } from "vitest";
import { lapseStage } from "./credential-lapse";

describe("lapseStage", () => {
  const today = "2026-10-14";

  it("marks a past date as lapsed", () => {
    expect(lapseStage("2026-10-13", today)).toBe("lapsed");
  });

  it("warns inside seven days", () => {
    expect(lapseStage("2026-10-14", today)).toBe("7");
    expect(lapseStage("2026-10-21", today)).toBe("7");
  });

  it("warns inside thirty days", () => {
    expect(lapseStage("2026-10-22", today)).toBe("30");
    expect(lapseStage("2026-11-13", today)).toBe("30");
  });

  it("stays quiet when the document is still current", () => {
    expect(lapseStage("2026-11-14", today)).toBeNull();
    expect(lapseStage("not-a-date", today)).toBeNull();
  });
});
