const BLOCK_WORDS = [
  "nude",
  "naked",
  "porn",
  "xxx",
  "nsfw",
  "gore",
  "violence",
  "hate",
  "slur",
];

export function moderatePhotoHeuristic(input: {
  fileName?: string;
  caption?: string;
  title?: string;
}): { allowed: boolean; flagged: boolean; reasons: string[] } {
  const blob = `${input.fileName ?? ""} ${input.caption ?? ""} ${input.title ?? ""}`.toLowerCase();
  const reasons: string[] = [];
  for (const w of BLOCK_WORDS) {
    if (blob.includes(w)) reasons.push(`Blocked keyword: ${w}`);
  }
  if (reasons.length > 0) {
    return { allowed: false, flagged: true, reasons };
  }
  return { allowed: true, flagged: false, reasons: [] };
}
