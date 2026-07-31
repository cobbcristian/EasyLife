"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Paperclip } from "lucide-react";
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

/** Board / PM private channel — MVP bubble layout (no PortalPageHero). */
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/messages?channel=${channel}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => {});
  }, [channel]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

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
    setMessages((prev) => [...prev, data.message]);
    setDraft("");
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    await sendBody(draft);
  }

  function attach(kind: "file" | "image") {
    const body =
      kind === "file"
        ? "[file:attachment.pdf]"
        : "[image:/brand/service-hero.png]";
    void sendBody(body);
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t(title)} right="avatar" avatarName={avatarName} />
      <PageBody>
        <PortalPageIntro
          eyebrow={channel === "board" ? "Board workspace" : "Property manager workspace"}
          title={title}
          description={subtitle}
        />
        <div className="flex min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-border-2 bg-white">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {messages.length === 0 ? (
              <EmptyState
                title={t("No messages yet.")}
                description={t("Start a private thread with your board or property team.")}
                className="border-0 bg-transparent"
                action={
                  <button
                    type="button"
                    onClick={() => inputRef.current?.focus()}
                    className="inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                  >
                    {t("Start conversation")}
                  </button>
                }
              />
            ) : (
              messages.map((m) => {
                const isMine = m.author === avatarName;
                return (
                  <div
                    key={m.id}
                    className={cn("flex gap-3", isMine ? "flex-row-reverse" : "flex-row")}
                  >
                    <Avatar
                      name={m.author}
                      size="sm"
                      className="shrink-0 !bg-[var(--mvp-blue)]"
                    />
                    <div className={cn("max-w-[75%]", isMine ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "mb-1 flex items-center gap-2 text-[12px] text-grey",
                          isMine && "justify-end",
                        )}
                      >
                        <span className="font-medium text-ink">{m.author}</span>
                        <span>{formatDate(m.time)}</span>
                      </div>
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                          isMine
                            ? "rounded-br-md bg-[var(--mvp-blue)] text-white"
                            : "rounded-bl-md bg-[#f2f2f7] text-black",
                        )}
                      >
                        {m.body}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <form
            onSubmit={send}
            className="flex items-center gap-3 border-t border-border-2 px-5 py-4"
          >
            <button
              type="button"
              onClick={() => attach("file")}
              disabled={busy}
              className="text-grey disabled:opacity-40"
              aria-label={t("Attach")}
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => attach("image")}
              disabled={busy}
              className="text-grey disabled:opacity-40"
              aria-label={t("Add photo")}
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("Message")}
              className="h-10 flex-1 rounded-full border border-border-2 px-4 text-sm placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="h-10 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? t("Sending…") : t("Send")}
            </button>
          </form>
        </div>
      </PageBody>
    </div>
  );
}
