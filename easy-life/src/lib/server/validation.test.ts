import { describe, expect, it } from "vitest";
import { bookingSchema, parseBody, serviceRequestSchema } from "@/lib/server/validation";

describe("bookingSchema", () => {
  it("accepts valid booking input", () => {
    const result = parseBody(bookingSchema, {
      amenity: "Tennis Court",
      date: "2026-06-28",
      startTime: "10:00",
      endTime: "11:00",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects end before start", () => {
    const result = parseBody(bookingSchema, {
      amenity: "Tennis Court",
      date: "2026-06-28",
      startTime: "11:00",
      endTime: "10:00",
    });
    expect(result.ok).toBe(false);
  });
});

describe("serviceRequestSchema", () => {
  it("requires title, category, and description", () => {
    const result = parseBody(serviceRequestSchema, { title: "", category: "Plumbing", description: "Leak" });
    expect(result.ok).toBe(false);
  });
});
