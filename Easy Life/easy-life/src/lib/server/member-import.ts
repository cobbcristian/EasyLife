import { prisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/server/password";
import { findUserByEmail } from "@/lib/server/db";

export type MemberImportRow = {
  name: string;
  email: string;
  unit?: string;
  phone?: string;
};

export type MemberImportResult = {
  created: Array<{ name: string; email: string; tempPassword: string }>;
  skipped: Array<{ email: string; reason: string }>;
};

function tempPassword(): string {
  return `EL-${Math.random().toString(36).slice(2, 8)}!${Math.floor(Math.random() * 90 + 10)}`;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseMemberCsv(text: string): MemberImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ""));
  const hasHeader = header.some((h) => h === "email" || h === "name");
  const start = hasHeader ? 1 : 0;

  const nameIdx = hasHeader ? header.indexOf("name") : 0;
  const emailIdx = hasHeader ? header.indexOf("email") : 1;
  const unitIdx = hasHeader ? header.indexOf("unit") : 2;
  const phoneIdx = hasHeader ? header.indexOf("phone") : 3;

  const rows: MemberImportRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const name = cols[nameIdx >= 0 ? nameIdx : 0]?.trim();
    const email = cols[emailIdx >= 0 ? emailIdx : 1]?.trim().toLowerCase();
    if (!name || !email || !email.includes("@")) continue;
    rows.push({
      name,
      email,
      unit: unitIdx >= 0 ? cols[unitIdx]?.trim() : undefined,
      phone: phoneIdx >= 0 ? cols[phoneIdx]?.trim() : undefined,
    });
  }
  return rows;
}

export type DocumentImportRow = { title: string; url: string; category: string };

export function parseDocumentImport(text: string): DocumentImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = header.includes("title") && header.includes("url");
  const start = hasHeader ? 1 : 0;
  const titleIdx = hasHeader ? header.indexOf("title") : 0;
  const urlIdx = hasHeader ? header.indexOf("url") : 1;
  const catIdx = hasHeader ? header.indexOf("category") : 2;

  const rows: DocumentImportRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const title = cols[titleIdx >= 0 ? titleIdx : 0]?.trim();
    const url = cols[urlIdx >= 0 ? urlIdx : 1]?.trim();
    if (!title || !url) continue;
    rows.push({
      title,
      url,
      category: cols[catIdx >= 0 ? catIdx : 2]?.trim() || "General",
    });
  }
  return rows;
}

export async function importCommunityMembers(
  communityId: string,
  rows: MemberImportRow[],
): Promise<MemberImportResult> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });
  if (!community) throw new Error("Community not found");

  const created: MemberImportResult["created"] = [];
  const skipped: MemberImportResult["skipped"] = [];

  for (const row of rows) {
    const existing = await findUserByEmail(row.email);
    if (existing) {
      skipped.push({ email: row.email, reason: "Account already exists" });
      continue;
    }

    const password = tempPassword();
    await prisma.user.create({
      data: {
        email: row.email,
        password: hashPassword(password),
        name: row.name,
        role: "member",
        communityId,
      },
    });

    await prisma.memberProfileExt.upsert({
      where: { userEmail: row.email.toLowerCase() },
      create: {
        userEmail: row.email.toLowerCase(),
        phone: row.phone ?? null,
        unit: row.unit ?? null,
      },
      update: {
        phone: row.phone ?? undefined,
        unit: row.unit ?? undefined,
      },
    });

    created.push({ name: row.name, email: row.email, tempPassword: password });
  }

  if (created.length > 0) {
    const count = await prisma.user.count({
      where: { communityId, role: "member" },
    });
    await prisma.community.update({
      where: { id: communityId },
      data: { residentCount: count },
    });
  }

  return { created, skipped };
}

export type AmenityImportRow = {
  name: string;
  kind: string;
  fee: number;
  schedule: string;
  unitCount: number;
  surface?: string;
};

export function parseAmenityCsv(text: string): AmenityImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ""));
  const hasHeader = header.includes("name");
  const start = hasHeader ? 1 : 0;
  const nameIdx = hasHeader ? header.indexOf("name") : 0;
  const kindIdx = hasHeader ? header.indexOf("kind") : 1;
  const feeIdx = hasHeader ? header.indexOf("fee") : 2;
  const scheduleIdx = hasHeader ? header.indexOf("schedule") : 3;
  const unitsIdx = hasHeader ? header.indexOf("units") : 4;
  const surfaceIdx = hasHeader ? header.indexOf("surface") : 5;

  const rows: AmenityImportRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const name = cols[nameIdx >= 0 ? nameIdx : 0]?.trim();
    if (!name) continue;
    rows.push({
      name,
      kind: cols[kindIdx >= 0 ? kindIdx : 1]?.trim() || "court",
      fee: Number(cols[feeIdx >= 0 ? feeIdx : 2]) || 0,
      schedule: cols[scheduleIdx >= 0 ? scheduleIdx : 3]?.trim() || "Daily 7am–9pm",
      unitCount: Number(cols[unitsIdx >= 0 ? unitsIdx : 4]) || 1,
      surface: cols[surfaceIdx >= 0 ? surfaceIdx : 5]?.trim() || undefined,
    });
  }
  return rows;
}

export async function importCommunityAmenities(
  communityId: string,
  rows: AmenityImportRow[],
): Promise<{ imported: number }> {
  const { createAmenity } = await import("@/lib/server/records");
  let imported = 0;
  for (const row of rows) {
    await createAmenity({
      communityId,
      name: row.name,
      description: `${row.name} — imported`,
      fee: row.fee,
      schedule: row.schedule,
      kind: row.kind,
      unitCount: row.unitCount,
      surface: row.surface ?? null,
    });
    imported++;
  }
  return { imported };
}
