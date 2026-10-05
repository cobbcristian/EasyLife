import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { providerWhereForSession } from "@/lib/server/provider-identity";

describe("providerWhereForSession", () => {
  it("scopes by communityId and normalized email only", () => {
    expect(
      providerWhereForSession({
        communityId: "oceanside-residents",
        email: " Ace@Club.COM ",
      }),
    ).toEqual({
      communityId: "oceanside-residents",
      email: "ace@club.com",
    });
  });

  it("does not include a name predicate (name collisions must not bind)", () => {
    const where = providerWhereForSession({
      communityId: "iron-lake",
      email: "pro@example.com",
    });
    expect(where).not.toHaveProperty("name");
    expect(where).not.toHaveProperty("OR");
  });
});

describe("provider routes reject name-based identity fallback", () => {
  const root = path.join(__dirname, "../../app/api/provider");

  it.each([
    "credentials/route.ts",
    "community/route.ts",
    "clinics/route.ts",
  ])("%s looks up providers by email, not display name", (rel) => {
    const source = readFileSync(path.join(root, rel), "utf8");
    expect(source).toMatch(/providerWhereForSession|findProviderForSession/);
    expect(source).not.toMatch(/OR:\s*\[\s*\{\s*email/);
    expect(source).not.toMatch(/name:\s*session\.name/);
  });
});
