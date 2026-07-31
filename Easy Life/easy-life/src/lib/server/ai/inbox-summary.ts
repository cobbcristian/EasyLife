import { openAiChat, isOpenAiConfigured } from "@/lib/server/ai/openai";

export function summarizeInboxHeuristic(
  items: Array<{ title: string; body: string }>,
): string {
  if (items.length === 0) return "You're all caught up — no unread notices.";
  const titles = items.slice(0, 8).map((i) => i.title);
  const head = items.length === 1 ? "1 notice" : `${items.length} notices`;
  return `${head}: ${titles.join("; ")}${items.length > 8 ? "…" : ""}.`;
}

export async function summarizeInbox(
  items: Array<{ title: string; body: string }>,
): Promise<{ summary: string; provider: "heuristic" | "openai" }> {
  const heuristic = summarizeInboxHeuristic(items);
  if (!isOpenAiConfigured() || items.length === 0) {
    return { summary: heuristic, provider: "heuristic" };
  }
  const raw = await openAiChat({
    maxTokens: 220,
    messages: [
      {
        role: "system",
        content:
          "Summarize club member inbox notices in 2 short sentences. Be concrete. No markdown.",
      },
      {
        role: "user",
        content: items
          .slice(0, 12)
          .map((i) => `- ${i.title}: ${i.body}`)
          .join("\n"),
      },
    ],
  });
  if (!raw) return { summary: heuristic, provider: "heuristic" };
  return { summary: raw, provider: "openai" };
}
