import { describe, expect, it } from "vitest";
import { shouldDeleteDirectoryRowOnReject } from "@/lib/server/member-enrollment";

describe("rejectPendingMember directory cleanup", () => {
  it("keeps the directory row when another resident shares the display name", () => {
    expect(
      shouldDeleteDirectoryRowOnReject({ otherUsersWithSameName: true }),
    ).toBe(false);
  });

  it("allows directory cleanup when the rejected user uniquely owns the name", () => {
    expect(
      shouldDeleteDirectoryRowOnReject({ otherUsersWithSameName: false }),
    ).toBe(true);
  });
});
