"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from "react";
import {
  Archive,
  CheckCheck,
  ChevronLeft,
  FolderPlus,
  ImagePlus,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { ProviderContentHeader } from "@/components/layout/provider-content-header";
import { PageBody } from "@/components/layout/content-header";
import { Avatar } from "@/components/ui/avatar";
import {
  ProviderCreateBookingSheet,
  type CreateBookingPayload,
} from "@/components/provider/provider-create-booking-sheet";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ARCHIVE_STORAGE_PREFIX = "el-provider-msg-archive:";

type DirectoryEntry = { name: string; email: string; visible?: boolean };

function loadArchivedIds(email: string): string[] {
  if (typeof window === "undefined" || !email) return [];
  try {
    const raw = window.localStorage.getItem(`${ARCHIVE_STORAGE_PREFIX}${email.toLowerCase()}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function persistArchivedIds(email: string, ids: string[]) {
  if (typeof window === "undefined" || !email) return;
  try {
    window.localStorage.setItem(
      `${ARCHIVE_STORAGE_PREFIX}${email.toLowerCase()}`,
      JSON.stringify(ids),
    );
  } catch {
    // ignore quota / private mode
  }
}

interface ThreadMessage {
  id: string;
  body: string;
  from: string;
  fromEmail: string;
  isMine: boolean;
  time: string;
  unread: boolean;
}

interface MessageThread {
  id: string;
  from: string;
  counterpartyEmail: string;
  community: string;
  preview: string;
  subject: string;
  time: string;
  unread: boolean;
  messages: ThreadMessage[];
}

/** Figma Service Messages + Message Conversation (4616:15127, 4616:17866, 4616:15640). */
const FIGMA_QUICK_REPLIES = [
  "Hi! Yes we have availability next week on Monday, Tuesday, Thursday, Friday, and Saturday in the afternoons.",
  "Let's do next Tuesday at 2p!",
  "I will schedule it and send an invite! Thanks",
] as const;

const FILE_PREFIX = "[file:";
const IMAGE_PREFIX = "[image:";

function parseAttachment(body: string):
  | { kind: "file"; label: string }
  | { kind: "image"; label: string }
  | null {
  if (body.startsWith(FILE_PREFIX) && body.endsWith("]")) {
    return { kind: "file", label: body.slice(FILE_PREFIX.length, -1) };
  }
  if (body.startsWith(IMAGE_PREFIX) && body.endsWith("]")) {
    return { kind: "image", label: body.slice(IMAGE_PREFIX.length, -1) };
  }
  return null;
}

function MessageBubbles({
  messages,
  scrollRef,
  className,
}: {
  messages: ThreadMessage[];
  scrollRef: RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  return (
    <div ref={scrollRef} className={cn("flex-1 space-y-4 overflow-y-auto", className)}>
      {messages.map((message) => {
        const attachment = parseAttachment(message.body);
        return (
          <div
            key={message.id}
            className={cn("flex flex-col", message.isMine ? "items-end" : "items-start")}
          >
            <span className="mb-1 inline-flex items-center gap-1 text-[11px] text-grey">
              {message.time}
              {message.isMine ? (
                <CheckCheck className="h-3.5 w-3.5 text-[var(--mvp-blue)]" />
              ) : null}
            </span>
            {attachment?.kind === "file" ? (
              <div className="flex h-[110px] w-[110px] flex-col items-center justify-center gap-1 rounded-xl border border-border-2 bg-white text-center">
                <p className="text-[13px] font-bold text-black">PDF</p>
                <p className="max-w-[96px] truncate px-1 text-[11px] text-grey">
                  {attachment.label}
                </p>
              </div>
            ) : attachment?.kind === "image" ? (
              <div
                className={cn(
                  "overflow-hidden rounded-2xl",
                  message.isMine ? "rounded-br-md" : "rounded-bl-md",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    attachment.label.startsWith("/")
                      ? attachment.label
                      : "/brand/service-hero.png"
                  }
                  alt=""
                  className="h-[160px] w-[240px] object-cover"
                />
              </div>
            ) : (
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  message.isMine
                    ? "rounded-br-md bg-[var(--mvp-blue)] text-white"
                    : "rounded-bl-md bg-[#f2f2f7] text-black",
                )}
              >
                {message.body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MessageComposer({
  reply,
  setReply,
  bookingRequest,
  busy,
  compact,
  onSubmit,
  onAttach,
  onCreateBooking,
  t,
}: {
  reply: string;
  setReply: (value: string) => void;
  bookingRequest: string | null;
  busy: boolean;
  compact?: boolean;
  onSubmit: (e?: FormEvent) => void;
  onAttach?: (kind: "file" | "image") => void;
  onCreateBooking?: () => void;
  t: (key: string) => string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e);
      }}
      className={cn("border-t border-border-2 bg-white", compact ? "px-3 py-3" : "px-4 py-4")}
    >
      {bookingRequest ? (
        <div className="mb-3 rounded-2xl border border-[var(--mvp-blue)]/20 bg-[var(--mvp-blue)]/5 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--mvp-blue)]">
            {t("Booking request")}
          </p>
          <p className="mt-1 line-clamp-3 text-[13px] text-ink">{bookingRequest}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FIGMA_QUICK_REPLIES.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => setReply(text)}
                className="rounded-full bg-white px-3 py-1.5 text-left text-[11px] font-semibold text-ink ring-1 ring-[#e4e8ee]"
              >
                {text.length > 42 ? `${text.slice(0, 40)}…` : text}
              </button>
            ))}
          </div>
          {onCreateBooking ? (
            <button
              type="button"
              onClick={onCreateBooking}
              className="mt-3 h-9 w-full rounded-lg bg-[var(--mvp-blue)] text-sm font-semibold text-white"
            >
              {t("Create Booking")}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onAttach?.("file")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-grey"
          aria-label={t("Attach file")}
        >
          <FolderPlus className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => onAttach?.("image")}
          className="rounded-lg p-2 text-grey"
          aria-label={t("Add photo")}
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={t("Message")}
          className={cn(
            "flex-1 rounded-full border border-border-2 bg-white px-4 text-sm placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]",
            compact ? "h-[35px]" : "h-11",
          )}
        />
        <button
          type="submit"
          disabled={busy || !reply.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--mvp-blue)] text-white disabled:opacity-40"
          aria-label={t("Send")}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

export default function ProviderMessagesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [avatarName, setAvatarName] = useState("");
  const [sessionEmail, setSessionEmail] = useState("");
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selected, setSelected] = useState<MessageThread | null>(null);
  const [mobileConversation, setMobileConversation] = useState(false);
  const [reply, setReply] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [composeTo, setComposeTo] = useState<DirectoryEntry | null>(null);
  const [composeBody, setComposeBody] = useState("");
  const [composeBusy, setComposeBusy] = useState(false);
  const [menuThreadId, setMenuThreadId] = useState<string | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const mobileHistoryRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(() => {
    fetch("/api/provider/messages")
      .then((r) => r.json())
      .then((d) => {
        const nextThreads: MessageThread[] = d.threads ?? [];
        setThreads(nextThreads);
        setSelected((current) => {
          if (!current) return nextThreads[0] ?? null;
          return nextThreads.find((thread) => thread.id === current.id) ?? current;
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        setAvatarName(d.name ?? "");
        const email = typeof d.email === "string" ? d.email : "";
        setSessionEmail(email);
        if (email) setArchivedIds(loadArchivedIds(email));
      })
      .catch(() => {});
    loadThreads();
    fetch("/api/directory")
      .then((r) => r.json())
      .then((d) => {
        setDirectory(
          ((d.directory ?? []) as DirectoryEntry[]).filter(
            (entry) => entry.visible !== false && Boolean(entry.email),
          ),
        );
      })
      .catch(() => {});
  }, [loadThreads]);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight });
    mobileHistoryRef.current?.scrollTo({ top: mobileHistoryRef.current.scrollHeight });
  }, [selected?.messages.length, selected?.id, mobileConversation]);

  useEffect(() => {
    if (!menuThreadId) return;
    function onDocClick() {
      setMenuThreadId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuThreadId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((thread) => {
      const isArchived = archivedIds.includes(thread.id);
      if (showArchived ? !isArchived : isArchived) return false;
      if (!q) return true;
      return (
        thread.from.toLowerCase().includes(q) ||
        thread.preview.toLowerCase().includes(q) ||
        thread.subject.toLowerCase().includes(q)
      );
    });
  }, [threads, query, showArchived, archivedIds]);

  const directoryMatches = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const base = directory.filter((d) => d.email.toLowerCase() !== sessionEmail.toLowerCase());
    if (!q) return base.slice(0, 8);
    return base
      .filter(
        (d) =>
          d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [directory, memberQuery, sessionEmail]);

  function setArchivedAndPersist(next: string[] | ((prev: string[]) => string[])) {
    setArchivedIds((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      persistArchivedIds(sessionEmail, resolved);
      return resolved;
    });
  }

  function toggleArchive(threadId: string) {
    setArchivedAndPersist((prev) =>
      prev.includes(threadId) ? prev.filter((id) => id !== threadId) : [...prev, threadId],
    );
    setMenuThreadId(null);
    if (selected?.id === threadId && !showArchived) {
      setSelected(null);
    }
  }

  async function markThreadUnread(thread: MessageThread) {
    const incomingIds = thread.messages.filter((m) => !m.isMine).map((m) => m.id);
    if (incomingIds.length === 0) {
      toast({ variant: "warning", title: t("Nothing to mark unread") });
      setMenuThreadId(null);
      return;
    }
    setThreads((prev) =>
      prev.map((item) =>
        item.id === thread.id
          ? {
              ...item,
              unread: true,
              messages: item.messages.map((m) =>
                m.isMine ? m : { ...m, unread: true },
              ),
            }
          : item,
      ),
    );
    setSelected((current) =>
      current?.id === thread.id
        ? {
            ...current,
            unread: true,
            messages: current.messages.map((m) =>
              m.isMine ? m : { ...m, unread: true },
            ),
          }
        : current,
    );
    setMenuThreadId(null);
    try {
      await fetch(`/api/provider/messages/${incomingIds[0]}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: incomingIds, unread: true }),
      });
    } catch {
      // optimistic UI already applied
    }
  }

  async function sendCompose() {
    if (!composeTo || !composeBody.trim()) return;
    setComposeBusy(true);
    const res = await fetch("/api/provider/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: composeTo.name,
        toEmail: composeTo.email,
        subject: `Message from ${avatarName || "provider"}`,
        message: composeBody.trim(),
      }),
    });
    setComposeBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not send message") });
      return;
    }
    toast({ variant: "success", title: t("Message sent") });
    setComposeOpen(false);
    setComposeTo(null);
    setComposeBody("");
    setMemberQuery("");
    loadThreads();
  }

  const bookingRequest = useMemo(() => {
    if (!selected) return null;
    const lastIncoming = [...selected.messages].reverse().find((m) => !m.isMine);
    if (!lastIncoming) return null;
    if (
      !/book|availability|clean|schedule|next week|request to book|service booking/i.test(
        lastIncoming.body,
      )
    ) {
      return null;
    }
    return lastIncoming.body;
  }, [selected]);

  async function createBookingFromThread(payload: CreateBookingPayload) {
    const res = await fetch("/api/provider/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        status: "accepted",
        goingCount: payload.invitees?.length
          ? 1 + payload.invitees.length
          : undefined,
      }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not create booking") });
      throw new Error("Could not create booking");
    }
    toast({
      variant: "success",
      title: t("Booking created"),
      description: `${payload.resident} · ${payload.date}`,
    });
    const confirmation = [
      `You're booked for ${payload.date} at ${payload.time}${payload.endTime ? `–${payload.endTime}` : ""}.`,
      payload.services.length ? `Services: ${payload.services.join(", ")}.` : "",
      "Reply here if you need to change anything.",
    ]
      .filter(Boolean)
      .join(" ");
    await sendReply(confirmation);
  }

  async function openThread(thread: MessageThread, opts?: { mobile?: boolean }) {
    setSelected(thread);
    if (opts?.mobile) setMobileConversation(true);
    const unreadIds = thread.messages.filter((m) => m.unread).map((m) => m.id);
    if (unreadIds.length === 0) return;

    setThreads((prev) =>
      prev.map((item) =>
        item.id === thread.id
          ? {
              ...item,
              unread: false,
              messages: item.messages.map((m) => ({ ...m, unread: false })),
            }
          : item,
      ),
    );
    setSelected({
      ...thread,
      unread: false,
      messages: thread.messages.map((m) => ({ ...m, unread: false })),
    });

    try {
      await fetch(`/api/provider/messages/${unreadIds[0]}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: unreadIds }),
      });
    } catch {
      // optimistic UI already cleared the alert
    }
  }

  async function sendReply(bodyOverride?: string) {
    if (!selected) return;
    const message = (bodyOverride ?? reply).trim();
    if (!message) return;
    setBusy(true);
    const res = await fetch("/api/provider/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: selected.from,
        toEmail: selected.counterpartyEmail,
        subject: selected.subject ? `Re: ${selected.subject}` : `Re: Message from ${selected.from}`,
        message,
        threadId: selected.id,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not send reply") });
      return;
    }
    const data = await res.json();
    const sent = data.message as ThreadMessage | undefined;
    if (sent) {
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === selected.id
            ? {
                ...thread,
                preview: sent.body,
                time: sent.time,
                messages: [...thread.messages, sent],
              }
            : thread,
        ),
      );
      setSelected((current) =>
        current
          ? {
              ...current,
              preview: sent.body,
              time: sent.time,
              messages: [...current.messages, sent],
            }
          : current,
      );
    } else {
      loadThreads();
    }
    toast({ variant: "success", title: t("Reply sent") });
    setReply("");
  }

  function attachMessage(kind: "file" | "image") {
    const body =
      kind === "file"
        ? `${FILE_PREFIX}invoice #00413]`
        : `${IMAGE_PREFIX}/brand/service-hero.png]`;
    void sendReply(body);
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <div className={cn(mobileConversation && "hidden lg:block")}>
        <ProviderContentHeader title={t("Messages")} avatarName={avatarName} />
      </div>
      <PageBody className="!p-0 sm:!p-0">
        {selected && mobileConversation ? (
          <div className="flex h-[calc(100dvh-1rem)] flex-col bg-white lg:hidden">
            <div className="flex items-center gap-2 border-b border-border-2 px-3 py-3">
              <button
                type="button"
                onClick={() => setMobileConversation(false)}
                className="rounded-lg p-1.5 text-ink"
                aria-label={t("Back")}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <p className="min-w-0 flex-1 truncate text-center text-[17px] font-medium text-black">
                {selected.from}
              </p>
              <span className="w-8" aria-hidden />
            </div>
            <p className="py-3 text-center text-xs text-grey">
              {selected.subject || t("Conversation")}
            </p>
            <MessageBubbles
              messages={selected.messages}
              scrollRef={mobileHistoryRef}
              className="px-4 pb-4"
            />
            <div className="pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <MessageComposer
                reply={reply}
                setReply={setReply}
                bookingRequest={bookingRequest}
                busy={busy}
                compact
                onSubmit={() => void sendReply()}
                onAttach={attachMessage}
                onCreateBooking={() => setCreateOpen(true)}
                t={t}
              />
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "flex min-h-[calc(100vh-8rem)] overflow-hidden rounded-none border-y border-border-2 bg-white lg:min-h-[640px] lg:rounded-xl lg:border",
            mobileConversation && "hidden lg:flex",
          )}
        >
          <div className="flex w-full flex-col border-r border-border-2 lg:w-[365px] lg:shrink-0">
            <div className="border-b border-border-2 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{t("Inbox")}</p>
                <button
                  type="button"
                  onClick={() => setComposeOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  {t("New Message")}
                </button>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mvp-blue)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    showArchived ? t("Search archived messages") : t("Search messages")
                  }
                  className="h-12 w-full rounded-full border border-border-2 bg-white py-2 pl-11 pr-12 text-sm placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
                />
                <button
                  type="button"
                  onClick={() => setShowArchived((v) => !v)}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5",
                    showArchived
                      ? "bg-[var(--mvp-blue)] text-white"
                      : "text-grey hover:bg-[#f2f2f7]",
                  )}
                  aria-label={showArchived ? t("Show inbox") : t("Access Archived")}
                  aria-pressed={showArchived}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </div>
              {showArchived ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--mvp-blue)]">
                  <Archive className="h-3.5 w-3.5" />
                  {t("Archived")}
                </p>
              ) : null}
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm text-grey">
                    {showArchived ? t("No archived messages.") : t("No messages yet.")}
                  </p>
                  {!showArchived ? (
                    <button
                      type="button"
                      onClick={() => setComposeOpen(true)}
                      className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                    >
                      <Plus className="h-4 w-4" />
                      {t("New Message")}
                    </button>
                  ) : null}
                </div>
              ) : (
                filtered.map((thread) => (
                  <div
                    key={thread.id}
                    className={cn(
                      "group relative flex w-full items-start gap-3 border-b border-border-2 px-4 py-4 transition hover:bg-[#fafafa]",
                      selected?.id === thread.id && "bg-[#f6f9fc]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const isMobile =
                          typeof window !== "undefined" &&
                          window.matchMedia("(max-width: 1023px)").matches;
                        void openThread(thread, { mobile: isMobile });
                      }}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <div className="relative shrink-0">
                        <Avatar name={thread.from} size="lg" />
                        {thread.unread ? (
                          <span className="absolute -left-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[var(--mvp-blue)]" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium text-black">{thread.from}</p>
                          <span className="shrink-0 text-[11px] text-grey">{thread.time}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-grey">{thread.preview}</p>
                      </div>
                    </button>
                    <div className="relative mt-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuThreadId((id) => (id === thread.id ? null : thread.id));
                        }}
                        className={cn(
                          "rounded-lg p-1.5 text-grey transition hover:bg-[#f2f2f7] hover:text-[var(--mvp-blue)]",
                          menuThreadId === thread.id
                            ? "bg-[#f2f2f7] opacity-100"
                            : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                        )}
                        aria-label={t("Message options")}
                        aria-expanded={menuThreadId === thread.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuThreadId === thread.id ? (
                        <div
                          role="menu"
                          className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border-2 bg-white py-1 shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => toggleArchive(thread.id)}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink hover:bg-[#f6f9fc]"
                          >
                            <Archive className="h-4 w-4 text-grey" />
                            {archivedIds.includes(thread.id) ? t("Unarchive") : t("Archive")}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => void markThreadUnread(thread)}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink hover:bg-[#f6f9fc]"
                          >
                            <Mail className="h-4 w-4 text-grey" />
                            {t("Mark as unread")}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 flex-col lg:flex">
            {selected ? (
              <>
                <div className="border-b border-border-2 px-6 py-4 text-center text-xs text-grey">
                  {selected.subject || t("Conversation")}
                </div>
                <MessageBubbles
                  messages={selected.messages}
                  scrollRef={historyRef}
                  className="px-6 py-5"
                />
                <MessageComposer
                  reply={reply}
                  setReply={setReply}
                  bookingRequest={bookingRequest}
                  busy={busy}
                  onSubmit={() => void sendReply()}
                  onAttach={attachMessage}
                  onCreateBooking={() => setCreateOpen(true)}
                  t={t}
                />
              </>
            ) : (
              <p className="flex flex-1 items-center justify-center text-sm text-grey">
                {t("Select a conversation to read the full history and reply.")}
              </p>
            )}
          </div>
        </div>
      </PageBody>

      <ProviderCreateBookingSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultResident={selected?.from}
        defaultDescription={bookingRequest ?? undefined}
        onCreate={createBookingFromThread}
      />

      {composeOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-title"
            className="w-full max-w-lg rounded-t-[24px] bg-white px-5 pb-8 pt-3 shadow-xl sm:rounded-2xl"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#d1d1d6]" />
            <div className="mb-4 flex items-center justify-between">
              <h2 id="compose-title" className="text-base font-semibold text-black">
                {t("New Message")}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setComposeOpen(false);
                  setComposeTo(null);
                  setComposeBody("");
                  setMemberQuery("");
                }}
                className="text-sm text-grey"
              >
                {t("Cancel")}
              </button>
            </div>
            {composeTo ? (
              <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#f6f9fc] px-3 py-2.5">
                <Avatar name={composeTo.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{composeTo.name}</p>
                  <p className="truncate text-xs text-grey">{composeTo.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setComposeTo(null)}
                  className="text-xs font-semibold text-[var(--mvp-blue)]"
                >
                  {t("Change")}
                </button>
              </div>
            ) : (
              <>
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder={t("Search members…")}
                  className="mb-3 h-11 w-full rounded-xl border border-border-2 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
                />
                <div className="mb-3 max-h-48 space-y-1 overflow-y-auto">
                  {directoryMatches.length === 0 ? (
                    <p className="px-1 py-4 text-center text-sm text-grey">
                      {t("No members found")}
                    </p>
                  ) : (
                    directoryMatches.map((entry) => (
                      <button
                        key={entry.email}
                        type="button"
                        onClick={() => setComposeTo(entry)}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#f6f9fc]"
                      >
                        <Avatar name={entry.name} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{entry.name}</p>
                          <p className="truncate text-xs text-grey">{entry.email}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={4}
              placeholder={t("Write your message…")}
              className="w-full rounded-xl border border-border-2 px-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            />
            <button
              type="button"
              disabled={composeBusy || !composeTo || !composeBody.trim()}
              onClick={() => void sendCompose()}
              className="mt-4 h-[50px] w-full rounded-xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-40"
            >
              {composeBusy ? t("Sending…") : t("Send")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
