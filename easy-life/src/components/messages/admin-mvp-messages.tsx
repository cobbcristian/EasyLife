"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCheck,
  ChevronLeft,
  FolderPlus,
  ImagePlus,
  Plus,
  Search,
  SlidersHorizontal,
  Archive,
  X,
} from "lucide-react";
import {
  ChatComposer,
  ChatThreadScroll,
} from "@/components/messages/chat-composer";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { cn } from "@/lib/utils";

interface Thread {
  id: string;
  title: string;
  lastMessage: string | null;
  lastAt: string | null;
}

interface ChatMsg {
  id: string;
  authorEmail: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface DirectoryEntry {
  name: string;
  email: string;
  visible?: boolean;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "a few seconds ago";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatDayLabel(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

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

/** Figma Community Admin Messages / Help Desk (5539:5368). */
export function AdminMvpMessages({ avatarName }: { avatarName?: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const profile = useSessionProfile();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [messagesThreadId, setMessagesThreadId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [mobileConversation, setMobileConversation] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [composeBusy, setComposeBusy] = useState(false);

  if (activeId !== messagesThreadId) {
    setMessagesThreadId(activeId);
    if (!activeId) setMessages([]);
  }

  function loadThreads() {
    return fetch("/api/messages/threads")
      .then((r) => r.json())
      .then((data) => {
        const list: Thread[] = data.threads ?? [];
        setThreads(list);
        setActiveId((current) => current ?? list[0]?.id ?? null);
        return list;
      })
      .catch(() => [] as Thread[]);
  }

  useEffect(() => {
    void loadThreads();
    // Staff compose uses full recipient list (not public directory opt-out).
    fetch("/api/messages/recipients")
      .then((r) => r.json())
      .then((d) => {
        setDirectory(
          ((d.directory ?? []) as DirectoryEntry[]).filter((entry) =>
            Boolean(entry.email),
          ),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeId) return;
    fetch(`/api/messages/threads/${activeId}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => setMessages([]));
  }, [activeId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((th) => {
      const isArchived = archivedIds.includes(th.id);
      if (showArchived !== isArchived) return false;
      if (!q) return true;
      return (
        th.title.toLowerCase().includes(q) ||
        (th.lastMessage ?? "").toLowerCase().includes(q)
      );
    });
  }, [threads, query, showArchived, archivedIds]);

  const active = useMemo(
    () => threads.find((th) => th.id === activeId) ?? null,
    [threads, activeId],
  );

  useEffect(() => {
    const chromeless = Boolean(active && mobileConversation);
    const rn = (
      window as Window & {
        ReactNativeWebView?: { postMessage: (msg: string) => void };
      }
    ).ReactNativeWebView;
    rn?.postMessage(
      JSON.stringify({ type: "plaza-chromeless", chromeless }),
    );
  }, [active, mobileConversation]);

  const directoryMatches = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const self = (profile.email ?? "").toLowerCase();
    const base = directory.filter((d) => d.email.toLowerCase() !== self);
    if (!q) return base.slice(0, 20);
    return base
      .filter(
        (d) =>
          d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [directory, memberQuery, profile.email]);

  const dayLabel = messages[0]?.createdAt ? formatDayLabel(messages[0].createdAt) : "";

  async function startDm(entry: DirectoryEntry) {
    setComposeBusy(true);
    const res = await fetch("/api/messages/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "dm", toEmail: entry.email, toName: entry.name }),
    });
    setComposeBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not start chat") });
      return;
    }
    const data = await res.json();
    setComposeOpen(false);
    setMemberQuery("");
    await loadThreads();
    setActiveId(data.thread.id);
    setMobileConversation(true);
  }

  async function send(e?: FormEvent, bodyOverride?: string) {
    e?.preventDefault();
    if (!activeId) return;
    const body = (bodyOverride ?? draft).trim();
    if (!body) return;
    setBusy(true);
    const res = await fetch(`/api/messages/threads/${activeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not send") });
      return;
    }
    const data = await res.json();
    const sent = data.message as ChatMsg | undefined;
    if (sent) {
      setMessages((prev) => [...prev, sent]);
      setThreads((prev) =>
        prev.map((th) =>
          th.id === activeId
            ? { ...th, lastMessage: sent.body, lastAt: sent.createdAt }
            : th,
        ),
      );
    }
    setDraft("");
  }

  function attach(kind: "file" | "image") {
    const body =
      kind === "file"
        ? `${FILE_PREFIX}invoice #00413]`
        : `${IMAGE_PREFIX}/brand/service-hero.png]`;
    void send(undefined, body);
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader
        title={t("Messages")}
        right="avatar"
        avatarName={avatarName ?? profile.name}
      />
      <PageBody className="!pt-0">
        <div className="flex items-center justify-end gap-2 px-4 pb-2 pt-3 md:px-0">
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            {t("New Message")}
          </button>
        </div>

        {composeOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-compose-title"
              className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            >
              <div className="relative border-b border-border-2 px-5 py-4">
                <h2 id="admin-compose-title" className="text-center text-base font-semibold text-black">
                  {t("Message a member")}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setComposeOpen(false);
                    setMemberQuery("");
                  }}
                  className="absolute right-4 top-3.5 rounded-md p-1 text-grey hover:bg-slate-100"
                  aria-label={t("Close")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 px-5 py-4">
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder={t("Search members")}
                  autoFocus
                  className="h-11 w-full rounded-lg border border-border-2 px-3 text-sm"
                />
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {directoryMatches.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-grey">{t("No members found")}</p>
                  ) : (
                    directoryMatches.map((d) => (
                      <button
                        key={d.email}
                        type="button"
                        disabled={composeBusy}
                        onClick={() => void startDm(d)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#f6f9fc] disabled:opacity-50"
                      >
                        <Avatar name={d.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-black">{d.name}</p>
                          <p className="truncate text-[11px] text-grey">{d.email}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {active && mobileConversation ? (
          <div className="fixed inset-0 z-40 flex flex-col bg-[#f2f2f7] md:hidden">
            <div className="flex shrink-0 items-center gap-2 border-b border-[#e5e5ea] bg-white/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
              <button
                type="button"
                onClick={() => setMobileConversation(false)}
                className="rounded-lg p-1.5 text-ink"
                aria-label={t("Back")}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <p className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold text-black">
                {active.title}
              </p>
              <span className="w-9" aria-hidden />
            </div>
            <ChatThreadScroll
              scrollKey={`${activeId}-${messages.length}-${messages.at(-1)?.id ?? ""}`}
            >
              {messages.map((m) => {
                const isMine =
                  !!profile.email &&
                  m.authorEmail.toLowerCase() === profile.email.toLowerCase();
                const attachment = parseAttachment(m.body);
                return (
                  <div
                    key={m.id}
                    className={cn("flex flex-col", isMine ? "items-end" : "items-start")}
                  >
                    {attachment?.kind === "file" ? (
                      <div className="rounded-xl border border-border-2 bg-white px-3 py-2 text-xs">
                        PDF · {attachment.label}
                      </div>
                    ) : attachment?.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          attachment.label.startsWith("/")
                            ? attachment.label
                            : "/brand/service-hero.png"
                        }
                        alt=""
                        className="h-40 w-56 rounded-2xl object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          "max-w-[80%] rounded-[18px] px-3.5 py-2 text-[15px] leading-snug",
                          isMine
                            ? "rounded-br-[4px] bg-[#007aff] text-white"
                            : "rounded-bl-[4px] bg-[#e9e9eb] text-black",
                        )}
                      >
                        {m.body}
                      </div>
                    )}
                  </div>
                );
              })}
            </ChatThreadScroll>
            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSend={async () => {
                await send();
              }}
              disabled={busy}
              placeholder={t("Message")}
            />
          </div>
        ) : null}

        <div
          className={cn(
            "flex min-h-[calc(100vh-140px)] overflow-hidden bg-white lg:min-h-[calc(100vh-120px)]",
            mobileConversation && "hidden md:flex",
          )}
        >
          <div className="flex w-full max-w-[365px] flex-col border-r border-border-2 bg-white">
            <div className="px-4 pb-3 pt-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mvp-blue)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    showArchived ? t("Search archived messages") : t("Search messages")
                  }
                  className="h-12 w-full rounded-full border border-border-2 bg-white py-2 pl-11 pr-12 text-sm text-ink placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
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
              </label>
              {showArchived ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--mvp-blue)]">
                  <Archive className="h-3.5 w-3.5" />
                  {t("Archived")}
                </p>
              ) : null}
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-grey">
                    {showArchived ? t("No archived messages.") : t("No messages yet.")}
                  </p>
                  {showArchived ? (
                    <button
                      type="button"
                      onClick={() => setShowArchived(false)}
                      className="mt-3 inline-flex text-sm font-semibold text-[var(--mvp-blue)]"
                    >
                      {t("Back to inbox")} →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setComposeOpen(true)}
                      className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                    >
                      <Plus className="h-4 w-4" />
                      {t("New Message")}
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((th) => {
                  const selected = th.id === activeId;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => {
                        setActiveId(th.id);
                        if (
                          typeof window !== "undefined" &&
                          window.matchMedia("(max-width: 767px)").matches
                        ) {
                          setMobileConversation(true);
                        }
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#f8f9fb]",
                        selected && "bg-[#f8f9fb]",
                      )}
                    >
                      <Avatar
                        name={th.title}
                        size="lg"
                        className="h-[65px] w-[65px] shrink-0 !bg-[var(--mvp-blue)]"
                      />
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[15px] font-semibold text-black">
                            {th.title}
                          </p>
                          <span className="shrink-0 text-[12px] text-grey">
                            {relativeTime(th.lastAt)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "mt-0.5 line-clamp-2 text-[13px] leading-snug text-grey",
                            selected && "font-medium text-ink",
                          )}
                        >
                          {th.lastMessage ?? ""}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="hidden min-h-0 min-w-0 flex-1 flex-col md:flex">
            {active ? (
              <>
                <div className="flex items-center justify-end border-b border-border-2 px-6 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setArchivedIds((prev) => {
                        const already = prev.includes(active.id);
                        if (!already) setActiveId(null);
                        return already
                          ? prev.filter((id) => id !== active.id)
                          : [...prev, active.id];
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-grey hover:bg-[#f2f2f7] hover:text-ink"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {archivedIds.includes(active.id) ? t("Unarchive") : t("Archive")}
                  </button>
                </div>
                <ChatThreadScroll scrollKey={`${activeId}-${messages.length}`} className="bg-[#f2f2f7]">
                  {dayLabel ? (
                    <p className="text-center text-[13px] text-grey">{dayLabel}</p>
                  ) : null}
                  {messages.map((m) => {
                    const isMine =
                      !!profile.email &&
                      m.authorEmail.toLowerCase() === profile.email.toLowerCase();
                    const attachment = parseAttachment(m.body);
                    return (
                      <div
                        key={m.id}
                        className={cn("flex flex-col", isMine ? "items-end" : "items-start")}
                      >
                        <div className="mb-1 flex items-center gap-1.5 text-[12px] text-grey">
                          <span>{relativeTime(m.createdAt)}</span>
                          {isMine ? (
                            <CheckCheck className="h-3.5 w-3.5 text-[#007aff]" />
                          ) : null}
                        </div>
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
                              isMine ? "rounded-br-md" : "rounded-bl-md",
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
                              "max-w-[420px] rounded-[18px] px-3.5 py-2 text-[15px] leading-snug",
                              isMine
                                ? "rounded-br-[4px] bg-[#007aff] text-white"
                                : "rounded-bl-[4px] bg-[#e9e9eb] text-black",
                            )}
                          >
                            {m.body}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </ChatThreadScroll>
                <ChatComposer
                  value={draft}
                  onChange={setDraft}
                  onSend={async () => {
                    await send();
                  }}
                  disabled={busy}
                  placeholder={t("Message")}
                  leading={
                    <>
                      <button
                        type="button"
                        onClick={() => attach("file")}
                        className="rounded-full p-2"
                        aria-label={t("Attach")}
                      >
                        <FolderPlus className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => attach("image")}
                        className="rounded-full p-2"
                        aria-label={t("Add photo")}
                      >
                        <ImagePlus className="h-5 w-5" />
                      </button>
                    </>
                  }
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-grey">
                {t("Select a conversation")}
              </div>
            )}
          </div>
        </div>
      </PageBody>
    </div>
  );
}
