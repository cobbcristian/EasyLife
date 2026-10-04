import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { openAiBarnabySpeech } from "@/lib/server/ai/openai";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let text = "";
  try {
    const body = (await request.json()) as { text?: string };
    text = typeof body.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const audio = await openAiBarnabySpeech(text);
  if (!audio) {
    return NextResponse.json({ error: "Voice unavailable" }, { status: 503 });
  }
  return new NextResponse(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
