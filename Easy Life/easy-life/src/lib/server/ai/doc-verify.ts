import { openAiVisionText, isOpenAiConfigured } from "@/lib/server/ai/openai";

export type DocKind = "registration" | "insurance" | "gov_id" | "check_in_id" | "general";

export type GenericDocClaim = {
  memberName: string;
  memberEmail: string;
  /** Extra tokens that should appear (plate, year, etc.). */
  expectedTokens?: string[];
};

export type GenericDocResult = {
  status: "verified" | "needs_review" | "rejected";
  score: number;
  notes: string[];
  extractedText: string;
  provider: "heuristic" | "openai";
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function scoreGenericDocument(
  claim: GenericDocClaim,
  text: string,
): Omit<GenericDocResult, "provider" | "extractedText"> {
  const hay = norm(`${text} ${claim.memberEmail}`);
  const notes: string[] = [];
  let score = 20;

  const nameParts = norm(claim.memberName).split(" ").filter(Boolean);
  const nameHits = nameParts.filter((p) => hay.includes(p)).length;
  if (nameHits >= Math.min(2, nameParts.length)) {
    score += 35;
    notes.push("Member name appears in document text");
  } else if (nameHits === 1) {
    score += 15;
    notes.push("Partial name match");
  } else {
    notes.push("Member name not clearly found");
  }

  if (hay.includes(norm(claim.memberEmail).split("@")[0] ?? "")) {
    score += 10;
  }

  for (const token of claim.expectedTokens ?? []) {
    if (token && hay.includes(norm(token))) {
      score += 12;
      notes.push(`Matched expected token: ${token}`);
    }
  }

  score = Math.min(100, score);
  let status: GenericDocResult["status"] = "needs_review";
  if (score >= 70) status = "verified";
  else if (score < 40) status = "rejected";
  return { status, score, notes };
}

export async function verifyGenericDocument(input: {
  claim: GenericDocClaim;
  kind: DocKind;
  fileName: string;
  buffer?: Buffer;
  mimeType?: string;
}): Promise<GenericDocResult> {
  let text = input.fileName;
  let provider: "heuristic" | "openai" = "heuristic";
  if (input.buffer && input.mimeType?.startsWith("image/") && isOpenAiConfigured()) {
    const ocr = await openAiVisionText({
      base64: input.buffer.toString("base64"),
      mimeType: input.mimeType,
      hint: input.kind,
    });
    if (ocr) {
      text = `${ocr} ${input.fileName}`;
      provider = "openai";
    }
  }
  const scored = scoreGenericDocument(input.claim, text);
  return { ...scored, extractedText: text, provider };
}
