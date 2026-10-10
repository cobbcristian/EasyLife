import { describe, expect, it } from "vitest";
import { isPrismaSerializationFailure } from "@/lib/server/hoa-dues";

describe("HOA open-charge claim", () => {
  it("detects Prisma Serializable conflicts for retry", () => {
    expect(isPrismaSerializationFailure({ code: "P2034" })).toBe(true);
    expect(
      isPrismaSerializationFailure(
        new Error("could not serialize access due to concurrent update"),
      ),
    ).toBe(true);
    expect(isPrismaSerializationFailure(new Error("unique constraint"))).toBe(
      false,
    );
    expect(isPrismaSerializationFailure(null)).toBe(false);
  });
});
