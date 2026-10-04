"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { communityIsResidentialHoa } from "@/lib/community-features";
import { useI18n } from "@/lib/i18n";
import {
  ensureMicrophoneAccess,
  getSpeechRecognitionCtor,
  speechErrorMessage,
  type SpeechRecognitionLike,
} from "@/lib/speech";

type AiAction =
  | { type: "open"; label: string; href: string }
  | {
      type: "prefill_dining";
      label: string;
      restaurant?: string;
      fulfillment?: string;
    }
  | {
      type: "suggest_booking";
      label: string;
      amenityHint?: string;
      date?: string;
      time?: string;
    }
  | {
      type: "book_amenity";
      label: string;
      amenityId: string;
      amenityName: string;
      date: string;
      startTime: string;
      endTime: string;
    }
  | {
      type: "book_vendor";
      label: string;
      providerId: string;
      providerName: string;
      sport: "tennis" | "golf" | "pickleball";
      date: string;
      startTime: string;
      durationMinutes?: number;
    }
  | {
      type: "booked";
      label: string;
      href: string;
      summary: string;
    };

type ChatMsg = {
  id?: string;
  role: string;
  content: string;
  actions?: AiAction[];
};

let butlerAudio: HTMLAudioElement | null = null;

function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (butlerAudio) {
    butlerAudio.pause();
    butlerAudio = null;
  }
}

function playBarnabyFile(src: string) {
  stopSpeaking();
  const audio = new Audio(src);
  butlerAudio = audio;
  void audio.play().catch(() => {
    /* autoplay can wait for a tap */
  });
}

async function speakText(text: string) {
  stopSpeaking();
  try {
    const res = await fetch("/api/member/barnaby-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok && (res.headers.get("content-type") ?? "").includes("audio")) {
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      butlerAudio = audio;
      await audio.play();
      return;
    }
  } catch {
    /* device voice below */
  }
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.9;
  utter.pitch = 0.8;
  utter.lang = "en-GB";
  const voices = window.speechSynthesis.getVoices();
  const butler =
    voices.find((v) => /daniel|arthur|malcolm|uk english male|google uk english male/i.test(v.name)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("en-gb"));
  if (butler) utter.voice = butler;
  window.speechSynthesis.speak(utter);
}

const VOICE_PREF_KEY = "easy-life-assistant-voice";

function readVoicePref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(VOICE_PREF_KEY) === "on";
  } catch {
    return false;
  }
}

function actionHref(a: AiAction): string {
  switch (a.type) {
    case "open":
      return a.href;
    case "booked":
      return a.href;
    case "prefill_dining": {
      const q = new URLSearchParams();
      if (a.fulfillment) q.set("fulfillment", a.fulfillment);
      if (a.restaurant) q.set("restaurant", a.restaurant);
      const s = q.toString();
      return s ? `/member/dining?${s}` : "/member/dining";
    }
    case "suggest_booking": {
      const q = new URLSearchParams();
      if (a.amenityHint) q.set("hint", a.amenityHint);
      if (a.date) q.set("date", a.date);
      if (a.time) q.set("time", a.time);
      const s = q.toString();
      return a.amenityHint === "lesson"
        ? "/member/vendors"
        : s
          ? `/member/bookings?${s}`
          : "/member/bookings";
    }
    case "book_amenity":
      return "/member/bookings";
    case "book_vendor":
      return "/member/vendors";
    default: {
      const _exhaustive: never = a;
      return _exhaustive;
    }
  }
}

export function AssistantClient() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isResidentialHoa, setIsResidentialHoa] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    function pinComposer() {
      if (!vv) {
        setKeyboardInset(0);
        return;
      }
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(overlap);
    }
    pinComposer();
    vv?.addEventListener("resize", pinComposer);
    vv?.addEventListener("scroll", pinComposer);
    window.addEventListener("resize", pinComposer);
    return () => {
      vv?.removeEventListener("resize", pinComposer);
      vv?.removeEventListener("scroll", pinComposer);
      window.removeEventListener("resize", pinComposer);
    };
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, keyboardInset, listening]);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const bootstrappedQuery = useRef(false);
  const bootstrappedVoice = useRef(false);

  const load = useCallback(() => {
    return fetch("/api/ai/chat")
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => setMessages([]));
  }, []);

  useEffect(() => {
    setVoiceEnabled(readVoicePref());
    setSpeechAvailable(Boolean(getSpeechRecognitionCtor()));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let on = true;
    fetch("/api/member/profile")
      .then((r) => r.json())
      .then((d) => {
        if (!on) return;
        setIsResidentialHoa(communityIsResidentialHoa(d.communityId as string | undefined));
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  function setVoice(next: boolean) {
    setVoiceEnabled(next);
    try {
      window.localStorage.setItem(VOICE_PREF_KEY, next ? "on" : "off");
    } catch {
      /* ignore quota / private mode */
    }
    if (!next) {
      stopSpeaking();
      return;
    }
    playBarnabyFile("/brand/barnaby-butler-intro.mp3");
  }

  async function send(text?: string, confirmAction?: AiAction) {
    const message = (text ?? input).trim();
    if ((!message && !confirmAction) || busy) return;
    setBusy(true);
    setError(null);
    setInput("");
    const userLine = confirmAction
      ? message || `Confirm: ${confirmAction.label}`
      : message;
    setMessages((prev) => [...prev, { role: "user", content: userLine }]);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userLine, confirmAction }),
      });
      if (!res.ok) throw new Error("Assistant unavailable");
      const data = (await res.json()) as {
        reply: string;
        actions?: AiAction[];
        speak?: boolean;
      };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, actions: data.actions ?? [] },
      ]);
      if (voiceEnabled && (data.speak || confirmAction)) {
        speakText(data.reply);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (!q || bootstrappedQuery.current) return;
    bootstrappedQuery.current = true;
    void send(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once from URL
  }, [searchParams]);

  function focusComposer() {
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function toggleListen() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechAvailable(false);
      setError(
        t("Voice input isn’t available on this device. Type your request below."),
      );
      focusComposer();
      return;
    }

    setError(null);
    setListening(true);

    const mic = await ensureMicrophoneAccess();
    if (mic === "denied") {
      setListening(false);
      setError(
        t(
          "Microphone permission is required for voice. Enable it in Settings, or type your request.",
        ),
      );
      focusComposer();
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (!transcript) return;
      setInput(transcript);
      const final = Array.from(event.results).some((r) => r.isFinal);
      if (final) {
        setListening(false);
        recognition.stop();
        void send(transcript);
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      const msg = speechErrorMessage(event?.error);
      if (event?.error !== "aborted") {
        setError(t(msg));
        focusComposer();
      }
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setSpeechAvailable(true);
    } catch {
      setListening(false);
      setError(t("Could not start microphone. Type your request below."));
      focusComposer();
    }
  }

  useEffect(() => {
    if (bootstrappedVoice.current) return;
    if (searchParams.get("voice") !== "1") return;
    bootstrappedVoice.current = true;
    const timer = window.setTimeout(() => {
      void toggleListen();
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once from ?voice=1
  }, [searchParams]);

  function onActionClick(a: AiAction) {
    if (a.type === "book_amenity" || a.type === "book_vendor") {
      void send(`Confirm: ${a.label}`, a);
      return;
    }
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col overflow-hidden bg-white font-[family-name:var(--font-poppins)] text-ink md:h-[calc(100dvh-4rem)]">
      <div
        className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pt-4"
        style={{ paddingBottom: keyboardInset }}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
          {t("Member")}
        </p>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold">
              {t("Barnaby")}
            </h1>
            <p className="mt-1 text-sm text-grey">
              {voiceEnabled
                ? t("Voice or text ' I can book courts and in-app vendors, then confirm out loud.")
                : t("Text mode ' reply by typing. Turn Voice on to hear spoken confirmations.")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVoice(!voiceEnabled)}
            className={`mt-1 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold ${
              voiceEnabled
                ? "bg-[var(--mvp-blue)] text-white"
                : "bg-[#f2f4f7] text-grey ring-1 ring-[#e4e8ee]"
            }`}
            aria-pressed={voiceEnabled}
            aria-label={
              voiceEnabled ? t("Turn voice replies off") : t("Turn voice replies on")
            }
            title={
              voiceEnabled ? t("Voice replies on ' tap to mute") : t("Voice replies off ' tap to enable")
            }
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {voiceEnabled ? t("Voice on") : t("Voice off")}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            isResidentialHoa
              ? [
                  "Book a tennis court tomorrow at 10",
                  "What are the pool hours?",
                  "How do I pay HOA dues?",
                ]
              : [
                  "Book a tennis court tomorrow at 10",
                  "Book a lesson with a tennis pro",
                  "Order eat-in tonight",
                  "Grab & Go help",
                ]
          ).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void send(q)}
              className="rounded-full bg-[#f2f4f7] px-3 py-1.5 text-[12px] font-semibold text-ink"
            >
              {q}
            </button>
          ))}
        </div>

        <div ref={threadRef} className="mt-4 flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto pb-2">
          {messages.length === 0 ? (
            <p className="text-sm text-grey">
              {t("Say or type what you want booked ' I'll confirm when it's done.")}
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={m.id ?? `${m.role}-${i}`}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-[var(--mvp-blue)] text-white"
                      : "border border-[#e8ebf0] bg-[#fafbfc] text-ink"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.actions && m.actions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.actions.map((a, j) =>
                        a.type === "book_amenity" || a.type === "book_vendor" ? (
                          <button
                            key={`${a.type}-${j}`}
                            type="button"
                            disabled={busy}
                            onClick={() => onActionClick(a)}
                            className="rounded-full bg-[var(--mvp-blue)] px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
                          >
                            {a.label}
                          </button>
                        ) : (
                          <Link
                            key={`${a.type}-${j}`}
                            href={actionHref(a)}
                            className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[var(--mvp-blue)] ring-1 ring-[#e4e8ee]"
                          >
                            {a.label}
                          </Link>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {listening ? (
            <p className="text-sm font-medium text-[var(--mvp-blue)]" aria-live="polite">
              {t("Listening… speak now")}
            </p>
          ) : null}
        </div>

        <form
          className="shrink-0 border-t border-[#eceff3] bg-white py-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void toggleListen()}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                listening
                  ? "bg-red-500 text-white"
                  : "border border-[#e4e8ee] bg-white text-[var(--mvp-blue)]"
              }`}
              aria-label={listening ? t("Stop listening") : t("Voice input")}
              aria-pressed={listening}
              title={
                speechAvailable
                  ? t("Tap to speak")
                  : t("Voice may need permission — tap to try")
              }
            >
              {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                listening
                  ? t("Listening…")
                  : t("Ask or say: book a court tomorrow at 10'")
              }
              className="box-border h-11 min-w-0 flex-1 rounded-2xl border border-[#e4e8ee] px-4 text-sm leading-none outline-none focus:border-[var(--mvp-blue)]"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex h-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? t("'") : t("Send")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
