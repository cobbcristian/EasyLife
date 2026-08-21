"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, MicOff, Plus, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  ensureMicrophoneAccess,
  getSpeechRecognitionCtor,
  speechErrorMessage,
  type SpeechRecognitionLike,
} from "@/lib/speech";

type SearchResult = {
  type: string;
  id: string;
  label: string;
  meta: string;
  href: string;
};

/** Hard navigate — Next router.push is unreliable in the Oceanside WKWebView shell. */
function go(path: string) {
  if (typeof window === "undefined") return;
  window.location.assign(path);
}

/** ChatGPT-style “Ask Plaza” composer on member home. */
export function MemberMvpHomeSearch({
  className,
}: {
  className?: string;
  communityId?: string | null;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const placeholder = "Ask Plaza";

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function openAssistant(prompt?: string) {
    const q = (prompt ?? query).trim();
    go(q ? `/member/assistant?q=${encodeURIComponent(q)}` : "/member/assistant");
  }

  async function onMicTap() {
    // Immediate UI response — Apple rejected silent mic taps.
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setVoiceStatus(t("Listening stopped."));
      return;
    }

    setVoiceStatus(t("Listening… speak now"));
    setListening(true);
    setOpen(false);

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setListening(false);
      setVoiceStatus(
        t("Voice input isn’t available on this device. Opening Assistant…"),
      );
      window.setTimeout(() => go("/member/assistant"), 600);
      return;
    }

    const mic = await ensureMicrophoneAccess();
    if (mic === "denied") {
      setListening(false);
      setVoiceStatus(
        t(
          "Microphone permission is required for voice. Enable it in Settings, or type in Assistant.",
        ),
      );
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
      setQuery(transcript);
      const final = Array.from(event.results).some((r) => r.isFinal);
      if (final) {
        setListening(false);
        setVoiceStatus(t("Got it — opening Assistant…"));
        recognition.stop();
        go(`/member/assistant?q=${encodeURIComponent(transcript)}`);
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event?.error === "aborted") {
        setVoiceStatus(null);
        return;
      }
      setVoiceStatus(t(speechErrorMessage(event?.error)));
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setListening(false);
      setVoiceStatus(t("Could not start microphone. Opening Assistant…"));
      window.setTimeout(() => go("/member/assistant"), 600);
    }
  }

  return (
    <div ref={wrapRef} className={cn("relative z-10", className)}>
      <div
        className={cn(
          "flex h-14 items-center gap-2 rounded-full border bg-white px-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)]",
          listening ? "border-[var(--mvp-blue)] ring-2 ring-[var(--mvp-blue)]/25" : "border-[#e6eaf0]",
        )}
      >
        <Link
          href="/member/assistant"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#667085] hover:bg-[#f2f4f7]"
          aria-label={t("Open Plaza")}
          title={t("Ask Plaza")}
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
        </Link>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setVoiceStatus(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              openAssistant();
            }
          }}
          placeholder={listening ? t("Listening…") : t(placeholder)}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-[#98a2b3] focus:outline-none"
          aria-label={t("Ask Plaza")}
        />
        <button
          type="button"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:scale-95",
            listening
              ? "bg-red-500 text-white"
              : "text-[#667085] hover:bg-[#f2f4f7] active:bg-[#e8ebf0]",
          )}
          aria-label={listening ? t("Stop listening") : t("Voice input")}
          aria-pressed={listening}
          title={t("Ask with your voice")}
          onClick={() => void onMicTap()}
        >
          {listening ? (
            <MicOff className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <Mic className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--mvp-blue)] text-white shadow-sm hover:brightness-95"
          aria-label={t("Ask Plaza")}
          onClick={() => openAssistant()}
        >
          <Sparkles className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>

      {voiceStatus ? (
        <p
          className={cn(
            "mt-2 rounded-xl px-3 py-2 text-sm",
            listening
              ? "bg-[var(--mvp-blue)]/10 font-medium text-[var(--mvp-blue)]"
              : "bg-[#f2f4f7] text-ink",
          )}
          role="status"
          aria-live="polite"
        >
          {voiceStatus}
          {!listening ? (
            <>
              {" "}
              <button
                type="button"
                className="font-semibold text-[var(--mvp-blue)] underline"
                onClick={() => openAssistant()}
              >
                {t("Open Assistant")}
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      {open && query.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-border-2 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => openAssistant()}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--mvp-blue)]/10"
          >
            <Sparkles className="h-4 w-4 text-[var(--mvp-blue)]" />
            <span className="text-sm font-medium text-ink">
              {t("Ask Plaza")}: “{query.trim()}”
            </span>
          </button>
          {loading ? (
            <p className="px-4 py-3 text-sm text-grey">{t("Searching…")}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-grey">{t("No quick results — ask Plaza")}</p>
          ) : (
            results.map((r) => (
              <Link
                key={`${r.type}-${r.id}`}
                href={r.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 hover:bg-[var(--mvp-blue)]/10"
              >
                <p className="text-sm font-medium text-ink">{r.label}</p>
                <p className="text-xs text-grey">{r.meta}</p>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
