import { describe, expect, it } from "vitest";
import { parseDocumentImport, parseMemberCsv } from "@/lib/server/member-import";

describe("parseMemberCsv", () => {
  it("parses header row and normalizes email", () => {
    const rows = parseMemberCsv(
      "name,email,unit,phone\nJane Smith,jane@example.com,101,(555) 111-2222",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      name: "Jane Smith",
      email: "jane@example.com",
      unit: "101",
      phone: "(555) 111-2222",
    });
  });

  it("skips rows without valid email", () => {
    const rows = parseMemberCsv("name,email\nBob,bad-email\nAlice,alice@test.com");
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("alice@test.com");
  });
});

describe("parseDocumentImport", () => {
  it("parses title, url, category", () => {
    const rows = parseDocumentImport(
      "title,url,category\nBylaws,https://example.com/b.pdf,Governance",
    );
    expect(rows).toEqual([
      { title: "Bylaws", url: "https://example.com/b.pdf", category: "Governance" },
    ]);
  });

  it("defaults category to General", () => {
    const rows = parseDocumentImport("title,url,category\nRules,https://x.com/r.pdf,");
    expect(rows[0].category).toBe("General");
  });
});
