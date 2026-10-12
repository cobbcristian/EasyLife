import { moderatePhotoHeuristic } from "@/lib/server/ai/photo-moderate";
import { openAiChat, isOpenAiConfigured } from "@/lib/server/ai/openai";
import type { ModerationResult } from "@/lib/server/ai/types";

export async function moderateUpload(input: {
  fileName?: string;
  caption?: string;
  title?: string;
}): Promise<ModerationResult> {
  const heuristic = moderatePhotoHeuristic(input);
  if (!heuristic.allowed) {
    return { ...heuristic, provider: "heuristic" };
  }
  if (!isOpenAiConfigured()) {
    return { ...heuristic, provider: "heuristic" };
  }
  const raw = await openAiChat({
    maxTokens: 80,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          'Moderate club marketplace/gallery uploads. Reply JSON only: {"allowed":true|false,"flagged":true|false,"reasons":[]}',
      },
      {
        role: "user",
        content: `fileName=${input.fileName ?? ""} title=${input.title ?? ""} caption=${input.caption ?? ""}`,
      },
    ],
  });
  if (!raw) return { ...heuristic, provider: "heuristic" };
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      allowed?: boolean;
      flagged?: boolean;
      reasons?: string[];
    };
    return {
      allowed: parsed.allowed !== false,
      flagged: Boolean(parsed.flagged),
      reasons: parsed.reasons ?? [],
      provider: "openai",
    };
  } catch {
    return { ...heuristic, provider: "heuristic" };
  }
}

export { moderatePhotoHeuristic };
