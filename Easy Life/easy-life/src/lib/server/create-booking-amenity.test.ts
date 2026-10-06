import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Forged / cross-tenant amenityId used to skip hours, playable, rain, and
 * membership gates because createBooking only enforced those when findFirst
 * returned a row. POST /api/bookings and Barnaby confirmAction both hit this.
 */
describe("createBooking amenityId resolution", () => {
  it("rejects a supplied amenityId that is missing in the community", () => {
    const source = readFileSync(join(__dirname, "records.ts"), "utf8");
    const fnStart = source.indexOf("export async function createBooking");
    expect(fnStart).toBeGreaterThanOrEqual(0);
    const fnBody = source.slice(fnStart, fnStart + 12000);
    expect(fnBody).toContain('throw new BookingConflictError("Amenity not found.")');
    expect(fnBody).toMatch(/amenityId && !amenityRecord/);
    // Guard must run before the insert.
    const rejectAt = fnBody.indexOf('throw new BookingConflictError("Amenity not found.")');
    const createAt = fnBody.indexOf("prisma.booking.create");
    expect(rejectAt).toBeGreaterThanOrEqual(0);
    expect(createAt).toBeGreaterThan(rejectAt);
  });
});
