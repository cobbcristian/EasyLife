export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function openAiChatModel(): string {
  return process.env.OPENAI_CHAT_MODEL ?? process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
}

export function openAiVisionModel(): string {
  return process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

export async function openAiChat(input: {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openAiChatModel(),
        messages: input.messages,
        max_tokens: input.maxTokens ?? 600,
        temperature: input.temperature ?? 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

/** Extract readable text from an image (OCR-style). */
export async function openAiVisionText(input: {
  base64: string;
  mimeType: string;
  hint: string;
}): Promise<string | null> {
  if (!input.mimeType.startsWith("image/")) return null;
  return openAiChat({
    maxTokens: 800,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract all readable text from this ${input.hint} document or image. Return plain text only.`,
          },
          {
            type: "image_url",
            image_url: { url: `data:${input.mimeType};base64,${input.base64}` },
          },
        ],
      },
    ],
  });
}

/** Ask vision model to name a product from a camera note / description. */
export async function openAiMatchProduct(input: {
  cameraNote: string;
  catalog: Array<{ sku: string; name: string }>;
}): Promise<{ sku: string; confidence: number } | null> {
  const catalog = input.catalog
    .map((p) => `${p.sku}: ${p.name}`)
    .join("\n");
  const raw = await openAiChat({
    maxTokens: 120,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Match the camera observation to exactly one catalog SKU. Reply JSON only: {\"sku\":\"...\",\"confidence\":0.0-1.0}",
      },
      {
        role: "user",
        content: `Camera note: ${input.cameraNote}\n\nCatalog:\n${catalog}`,
      },
    ],
  });
  if (!raw) return null;
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) return null;
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
      sku?: string;
      confidence?: number;
    };
    if (!parsed.sku) return null;
    return {
      sku: parsed.sku,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.6)),
    };
  } catch {
    return null;
  }
}
