"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ImagePlus, Paperclip } from "lucide-react";
import {
  ChatComposer,
  ChatThreadScroll,
} from "@/components/messages/chat-composer";
import { ContentHeader, PageBody, PortalPageIntro } from "@/components/layout/content-header";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { cn, formatDate } from "@/lib/utils";

interface Message {
  id: string;
  author: string;
  body: string;
  time: string;
}

function setNativeChromeless(chromeless: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("member:chromeless", { detail: { chromeless } }),
  );
  const rn = (
    window as Window & {
      ReactNativeWebView?: { postMessage: (msg: string) => void };
    }
  ).ReactNativeWebView;
  rn?.postMessage(
    JSON.stringify({ type: "plaza-chromeless", chromeless }),
  );
}

/** Board / PM private channel — iMessage-style bubbles + blue up-arrow send. */
export function PrivateMessageBoard({
  channel,
  title,
  subtitle,
  avatarName,
}: {
  channel: "board" | "pm";
  title: string;
  subtitle: string;
  avatarName: string;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const backHref = channel === "board" ? "/board" : "/pm";

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?channel=${channel}`);
      if (!res.ok) return;
      const d = await res.json();
      setMessages(d.messages ?? []);
    } catch {
      /* ignore */
    }
  }, [channel]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  // Live refresh so new board / PM posts appear without a manual reload.
  useEffect(() => {
    const id = window.setInterval(() => {
      void loadMessages();
    }, 4000);
    return () => window.clearInterval(id);
  }, [loadMessages]);

  useEffect(() => {
    setNativeChromeless(true);
    return () => setNativeChromeless(false);
  }, []);

  function goBack() {
    // Hard navigation — WebView history often has nothing useful behind this screen.
    window.location.assign(backHref);
  }

  async function sendBody(body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, body: trimmed }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not send") });
      return;
    }
    const data = await res.json();
    setMessages((prev) => {
      if (prev.some((m) => m.id === data.message.id)) return prev;
      return [...prev, data.message];
    });
    setDraft("");
  }

  function attach(kind: "file" | "image") {
    const body =
      kind === "file"
        ? "[file:attachment.pdf]"
        : "[image:/brand/service-hero.png]";
    void sendBody(body);
  }

  const thread = (
    <>
      <ChatThreadScroll scrollKey={`${channel}-${messages.length}-${messages.at(-1)?.id ?? ""}`}>
        {messages.length === 0 ? (
          <EmptyState
            title={t("No messages yet.")}
            description={t("Start a private thread with your board or property team.")}
            className="border-0 bg-transparent"
          />
        ) : (
          messages.map((m) => {
            const isMine = m.author === avatarName;
            return (
              <div
                key={m.id}
                className={cn("flex gap-2", isMine ? "flex-row-reverse" : "flex-row")}
              >
                {!isMine ? (
                  <Avatar
                    name={m.author}
                    size="sm"
                    className="mt-1 shrink-0 !bg-[#007aff]"
                  />
                ) : null}
                <div
                  className={cn(
                    "flex max-w-[78%] flex-col",
                    isMine ? "items-end" : "items-start",
                  )}
                >
                  {!isMine ? (
                    <span className="mb-1 px-1 text-[11px] text-[#8e8e93]">
                      {m.author}
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "rounded-[18px] px-3.5 py-2 text-[15px] leading-snug",
                      isMine
                        ? "rounded-br-[4px] bg-[#007aff] text-white"
                        : "rounded-bl-[4px] bg-[#e9e9eb] text-black",
                    )}
                  >
                    {m.body}
                  </div>
                  <span className="mt-1 px-1 text-[10px] text-[#8e8e93]">
                    {formatDate(m.time)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </ChatThreadScroll>
      <ChatComposer
        value={draft}
        onChange={setDraft}
        onSend={() => sendBody(draft)}
        disabled={busy}
        placeholder={t("Message")}
        leading={
          <>
            <button
              type="button"
              onClick={() => attach("file")}
              disabled={busy}
              className="rounded-full p-2"
              aria-label={t("Attach")}
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => attach("image")}
              disabled={busy}
              className="rounded-full p-2"
              aria-label={t("Add photo")}
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          </>
        }
      />
    </>
  );

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      {/* Mobile — full-screen iMessage layout */}
      <div className="fixed inset-0 z-40 flex flex-col bg-[#f2f2f7] lg:hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-[#e5e5ea] bg-white/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
          <button
            type="button"
            onClick={goBack}
            className="rounded-lg p-1.5 text-black"
            aria-label={t("Back")}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[17px] font-semibold text-black">
              {t(title)}
            </p>
            <p className="truncate text-[11px] text-[#8e8e93]">{t(subtitle)}</p>
          </div>
          <span className="w-9" aria-hidden />
        </div>
        {thread}
      </div>

      {/* Desktop */}
      <div className="hidden lg:block">
        <ContentHeader title={t(title)} right="avatar" avatarName={avatarName} />
        <PageBody>
          <PortalPageIntro
            eyebrow={
              channel === "board"
                ? "Board workspace"
                : "Property manager workspace"
            }
            title={title}
            description={subtitle}
          />
          <div className="flex min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-border-2 bg-[#f2f2f7]">
            {thread}
          </div>
        </PageBody>
      </div>
    </div>
  );
}
