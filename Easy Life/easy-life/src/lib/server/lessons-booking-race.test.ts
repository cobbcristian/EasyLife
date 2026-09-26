import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Locks the Serializable transaction around lesson conflict checks + inserts.
 * Concurrent POST /api/member/lessons for the same pro/slot used to pass
 * check-then-insert and double-book the pro and court hold.
 */
describe("createLessonBooking concurrency guard", () => {
  it("runs conflict checks and inserts inside a Serializable transaction", () => {
    const source = readFileSync(
      join(__dirname, "lessons.ts"),
      "utf8",
    );
    const fnStart = source.indexOf("export async function createLessonBooking");
    expect(fnStart).toBeGreaterThanOrEqual(0);
    const fnBody = source.slice(fnStart, fnStart + 9000);
    expect(fnBody).toContain('isolationLevel: "Serializable"');
    expect(fnBody).toContain("$transaction");
    // Conflict reads must use the transaction client, not the global prisma.
    expect(fnBody).toMatch(/tx\.lessonBooking\.findMany/);
    expect(fnBody).toMatch(/tx\.booking\.findMany/);
    expect(fnBody).toMatch(/tx\.lessonBooking\.create/);
    expect(fnBody).toMatch(/tx\.booking\.create/);
  });
});
