import { describe, expect, it } from "vitest";
import { initialLessonStatus } from "@/lib/lesson-booking-policy";

describe("lesson-booking-policy", () => {
  it("keeps paid lessons pending until the fee is settled", () => {
    expect(initialLessonStatus(75)).toBe("pending");
    expect(initialLessonStatus(85)).toBe("pending");
    expect(initialLessonStatus(110)).toBe("pending");
    expect(initialLessonStatus(120)).toBe("pending");
  });

  it("auto-confirms free lessons", () => {
    expect(initialLessonStatus(0)).toBe("confirmed");
  });
});
