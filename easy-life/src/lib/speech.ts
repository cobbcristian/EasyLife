/** Browser / WKWebView speech helpers for the resident assistant. */

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
      }) => void)
    | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

export function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Prompt iOS/Android for mic access before SpeechRecognition (needed in WKWebView). */
export async function ensureMicrophoneAccess(): Promise<
  "granted" | "denied" | "unsupported"
> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "unsupported";
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) track.stop();
    return "granted";
  } catch {
    return "denied";
  }
}

export function speechErrorMessage(code?: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission is required for voice. Enable it in Settings, or type your request.";
    case "no-speech":
      return "Didn’t catch that — tap the mic and try again, or type your request.";
    case "audio-capture":
      return "No microphone was found. Type your request instead.";
    case "network":
      return "Voice needs a network connection. Check Wi‑Fi and try again, or type your request.";
    case "aborted":
      return "Listening stopped.";
    default:
      return "Voice input isn’t available right now. Type your request below.";
  }
}
