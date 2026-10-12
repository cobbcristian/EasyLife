import { openAiVisionText, isOpenAiConfigured } from "@/lib/server/ai/openai";
import { verifyGenericDocument } from "@/lib/server/ai/doc-verify";

export type VehicleClaim = {
  year?: number | null;
  make: string;
  model: string;
  plate: string;
  ownerName: string;
  memberName: string;
  memberEmail: string;
};

export type DocSignals = {
  kind: "registration" | "insurance" | "gov_id";
  fileName: string;
  /** Optional text extracted from OCR / vision / filename cues. */
  text: string;
};

export type FieldMatch = {
  field: string;
  matched: boolean;
  detail: string;
};

export type VerificationResult = {
  status: "verified" | "needs_review" | "rejected";
  score: number;
  matches: FieldMatch[];
  notes: string[];
  provider: "heuristic" | "openai";
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesToken(haystack: string, needle: string): boolean {
  const h = norm(haystack);
  const n = norm(needle);
  if (!n || n.length < 2) return false;
  return h.includes(n);
}

function nameOverlap(a: string, b: string): boolean {
  const ta = new Set(norm(a).split(" ").filter((t) => t.length > 1));
  const tb = norm(b).split(" ").filter((t) => t.length > 1);
  if (ta.size === 0 || tb.length === 0) return false;
  const hits = tb.filter((t) => ta.has(t)).length;
  return hits >= Math.min(2, tb.length);
}

/** Build searchable text from filename + optional OCR body. */
export function documentSearchText(fileName: string, ocrText = ""): string {
  return `${fileName.replace(/[_\-.]+/g, " ")} ${ocrText}`;
}

export function scoreVehicleDocuments(
  claim: VehicleClaim,
  docs: DocSignals[],
): VerificationResult {
  const notes: string[] = [];
  const matches: FieldMatch[] = [];

  const reg = docs.find((d) => d.kind === "registration");
  const ins = docs.find((d) => d.kind === "insurance");
  const id = docs.find((d) => d.kind === "gov_id");

  if (!reg) notes.push("Vehicle registration document is required.");
  if (!ins) notes.push("Proof of insurance is required.");
  if (!id) notes.push("Government ID (driver’s license or passport) is recommended for owner match.");

  const regText = reg ? documentSearchText(reg.fileName, reg.text) : "";
  const insText = ins ? documentSearchText(ins.fileName, ins.text) : "";
  const idText = id ? documentSearchText(id.fileName, id.text) : "";
  const allDocText = `${regText} ${insText} ${idText}`;

  const yearStr = claim.year != null ? String(claim.year) : "";
  const yearOk = yearStr
    ? includesToken(regText, yearStr) || includesToken(insText, yearStr) || includesToken(allDocText, yearStr)
    : false;
  matches.push({
    field: "year",
    matched: yearOk,
    detail: yearStr
      ? yearOk
        ? `Year ${yearStr} found in documents`
        : `Year ${yearStr} not found in uploaded documents`
      : "Year not provided",
  });

  const makeOk = includesToken(regText, claim.make) || includesToken(insText, claim.make);
  matches.push({
    field: "make",
    matched: makeOk,
    detail: makeOk ? `Make "${claim.make}" found` : `Make "${claim.make}" not found on registration/insurance`,
  });

  const modelOk = includesToken(regText, claim.model) || includesToken(insText, claim.model);
  matches.push({
    field: "model",
    matched: modelOk,
    detail: modelOk
      ? `Model "${claim.model}" found`
      : `Model "${claim.model}" not found on registration/insurance`,
  });

  const plateOk =
    includesToken(regText, claim.plate) ||
    includesToken(insText, claim.plate) ||
    includesToken(allDocText, claim.plate.replace(/\s+/g, ""));
  matches.push({
    field: "plate",
    matched: plateOk,
    detail: plateOk
      ? `Plate ${claim.plate} found`
      : `Plate ${claim.plate} not found on documents`,
  });

  const ownerOnDocs =
    nameOverlap(claim.ownerName, regText) ||
    nameOverlap(claim.ownerName, insText) ||
    nameOverlap(claim.ownerName, idText) ||
    includesToken(allDocText, claim.ownerName);
  matches.push({
    field: "owner_on_docs",
    matched: ownerOnDocs,
    detail: ownerOnDocs
      ? "Owner name appears on documents"
      : "Owner name not clearly found on registration, insurance, or ID",
  });

  const ownerIsMember =
    nameOverlap(claim.ownerName, claim.memberName) ||
    norm(claim.ownerName) === norm(claim.memberName) ||
    includesToken(claim.memberEmail, claim.ownerName.split(/\s+/)[0] ?? "");
  matches.push({
    field: "owner_is_member",
    matched: ownerIsMember,
    detail: ownerIsMember
      ? `Owner matches club member ${claim.memberName}`
      : `Owner "${claim.ownerName}" does not match member profile "${claim.memberName}"`,
  });

  const idSupportsOwner = id
    ? nameOverlap(claim.ownerName, idText) ||
      nameOverlap(claim.memberName, idText) ||
      /license|passport|driver|dl\b|id\b/i.test(id.fileName)
    : false;
  matches.push({
    field: "government_id",
    matched: Boolean(id) && (idSupportsOwner || Boolean(id)),
    detail: !id
      ? "No government ID uploaded"
      : idSupportsOwner
        ? "Government ID present and consistent with owner/member"
        : "Government ID uploaded — name match inconclusive (queued for staff review)",
  });

  // Weighted score
  let score = 0;
  if (reg) score += 15;
  if (ins) score += 15;
  if (id) score += 10;
  if (yearOk) score += 10;
  if (makeOk) score += 15;
  if (modelOk) score += 15;
  if (plateOk) score += 10;
  if (ownerOnDocs) score += 10;
  if (ownerIsMember) score += 15;
  if (id && idSupportsOwner) score += 5;

  let status: VerificationResult["status"];
  if (!reg || !ins || !ownerIsMember) {
    status = "rejected";
    if (!ownerIsMember) notes.push("Vehicle owner must be a club member on this account.");
  } else if (score >= 85 && makeOk && modelOk && (yearOk || !yearStr) && ownerOnDocs) {
    status = "verified";
    notes.push("Documents match the declared vehicle and member owner.");
  } else if (score >= 55) {
    status = "needs_review";
    notes.push("Partial match — club staff should review the uploads.");
  } else {
    status = "rejected";
    notes.push("Documents do not sufficiently match the declared vehicle details.");
  }

  return { status, score, matches, notes, provider: "heuristic" };
}

/** Optional OpenAI vision pass when OPENAI_API_KEY is set (images only). */
export async function extractTextWithOpenAI(input: {
  base64: string;
  mimeType: string;
  hint: string;
}): Promise<string | null> {
  return openAiVisionText(input);
}

export async function verifyVehicleRegistration(input: {
  claim: VehicleClaim;
  registration: { fileName: string; buffer?: Buffer; mimeType?: string };
  insurance: { fileName: string; buffer?: Buffer; mimeType?: string };
  govId?: { fileName: string; buffer?: Buffer; mimeType?: string } | null;
}): Promise<VerificationResult> {
  async function docText(
    kind: DocSignals["kind"],
    file: { fileName: string; buffer?: Buffer; mimeType?: string },
  ): Promise<DocSignals> {
    let text = "";
    if (file.buffer && file.mimeType?.startsWith("image/")) {
      const ocr = await extractTextWithOpenAI({
        base64: file.buffer.toString("base64"),
        mimeType: file.mimeType,
        hint: kind,
      });
      if (ocr) text = ocr;
    }
    // Filename often includes year/make in demos (e.g. 2022-toyota-camry-registration.pdf)
    text = `${text} ${file.fileName}`;
    return { kind, fileName: file.fileName, text };
  }

  const docs: DocSignals[] = [
    await docText("registration", input.registration),
    await docText("insurance", input.insurance),
  ];
  if (input.govId) docs.push(await docText("gov_id", input.govId));

  const result = scoreVehicleDocuments(input.claim, docs);
  if (isOpenAiConfigured() && docs.some((d) => d.text.length > 40)) {
    return { ...result, provider: "openai" };
  }
  return result;
}

export async function verifyMemberIdDocument(input: {
  memberName: string;
  memberEmail: string;
  fileName: string;
  buffer?: Buffer;
  mimeType?: string;
  expectedTokens?: string[];
}) {
  return verifyGenericDocument({
    kind: "check_in_id",
    claim: {
      memberName: input.memberName,
      memberEmail: input.memberEmail,
      expectedTokens: input.expectedTokens,
    },
    fileName: input.fileName,
    buffer: input.buffer,
    mimeType: input.mimeType,
  });
}
