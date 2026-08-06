"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ImagePlus, Paperclip, Plus } from "lucide-react";
import {
  ChatComposer,
  ChatThreadScroll,
} from "@/components/messages/chat-composer";
import { BrandIcon } from "@/components/ui/brand-icon";
import { Avatar } from "@/components/ui/avatar";
import {
  InviteMemberPicker,
  type InviteMember,
} from "@/components/ui/invite-member-picker";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { cn } from "@/lib/utils";

interface Thread {
  id: string;
  kind: string;
  title: string;
  participantEmails: string[];
  participantNames: string[];
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
  email: string;
  name: string;
  visible: boolean;
  role?: string;
  isManagement?: boolean;
}

/** Oceanside HOA message hubs — always shown first in New message. */
const OCEANSIDE_MESSAGE_HUB_EMAILS = [
  "admin.demo@oceansideresidents.com",
  "pm.demo@oceansideresidents.com",
  "social.committee@oceansideresidents.com",
  "board.demo@oceansideresidents.com",
] as const;

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
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

function MessageBody({ body, mine }: { body: string; mine: boolean }) {
  const attachment = parseAttachment(body);
  if (attachment?.kind === "file") {
    return (
      <div
        className={cn(
          "flex max-w-[240px] items-center gap-3 rounded-2xl px-4 py-3",
          mine ? "rounded-br-md bg-[var(--mvp-blue)] text-white" : "rounded-bl-md bg-[#f2f2f7] text-black",
        )}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase",
            mine ? "bg-white/20" : "bg-white text-[#ff3b30]",
          )}
        >
          PDF
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{attachment.label}</p>
          <p className={cn("text-[11px]", mine ? "text-white/80" : "text-grey")}>PDF document</p>
        </div>
      </div>
    );
  }
  if (attachment?.kind === "image") {
    return (
      <div className={cn("overflow-hidden rounded-2xl", mine ? "rounded-br-md" : "rounded-bl-md")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.label.startsWith("/") ? attachment.label : "/brand/service-hero.png"}
          alt=""
          className="h-[160px] w-[240px] object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "max-w-[75%] rounded-[18px] px-3.5 py-2 text-[15px] leading-snug",
        mine
          ? "rounded-br-[4px] bg-[#007aff] text-white"
          : "rounded-bl-[4px] bg-[#e9e9eb] text-black",
      )}
    >
      {body}
    </div>
  );
}

/** Figma Message Conversation long (4616:17866) — mobile-first member messaging. */
export default function MemberMessagesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const profile = useSessionProfile();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [bookingIntent, setBookingIntent] = useState(false);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [showNew, setShowNew] = useState<"dm" | "group" | null>(null);
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<InviteMember[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobileConversation, setMobileConversation] = useState(false);
  const [messagesThreadId, setMessagesThreadId] = useState<string | null>(null);
  if (activeId !== messagesThreadId) {
    setMessagesThreadId(activeId);
    if (!activeId) setMessages([]);
  }

  const loadThreads = useCallback(async () => {
    const res = await fetch("/api/messages/threads");
    if (!res.ok) return;
    const data = await res.json();
    setThreads(data.threads ?? []);
  }, []);

  useEffect(() => {
    if (!profile.email) return;
    let on = true;
    (async () => {
      try {
        const fetchThreads = async (): Promise<Thread[]> => {
          const res = await fetch("/api/messages/threads");
          if (!res.ok) return [];
          const data = await res.json();
          return data.threads ?? [];
        };

        let list = await fetchThreads();
        // First visit after a cold DB can race the seed — retry once.
        if (list.length === 0) {
          await new Promise((r) => setTimeout(r, 800));
          if (!on) return;
          list = await fetchThreads();
        }
        if (!on) return;
        setThreads(list);

        const dirRes = await fetch("/api/messages/recipients");
        const dirData = dirRes.ok
          ? await dirRes.json()
          : await fetch("/api/directory").then((r) => (r.ok ? r.json() : { directory: [] }));
        if (!on) return;
        setDirectory(
          (dirData.directory ?? []).filter(
            (d: DirectoryEntry) => Boolean(d.email) && d.email !== profile.email,
          ),
        );

        const params = new URLSearchParams(window.location.search);
        const to = params.get("to");
        const name = params.get("name");
        const draftParam = params.get("draft");
        if (to) {
          const res = await fetch("/api/messages/threads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "dm", toEmail: to, toName: name ?? to }),
          });
          if (res.ok) {
            const data = await res.json();
            const refreshed = await fetchThreads();
            if (!on) return;
            setThreads(refreshed);
            setActiveId(data.thread.id);
            setMobileConversation(true);
            if (draftParam) {
              setDraft(draftParam);
              setBookingIntent(/book|availability|cleaning|request to book/i.test(draftParam));
            }
          } else {
            const data = await res.json().catch(() => ({}));
            toast({
              variant: "warning",
              title: t("Could not start conversation"),
              description: typeof data.error === "string" ? data.error : undefined,
            });
          }
          window.history.replaceState({}, "", "/member/messages");
        } else if (draftParam) {
          setDraft(draftParam);
          setBookingIntent(/book|availability|cleaning|request to book/i.test(draftParam));
          window.history.replaceState({}, "", "/member/messages");
        }
      } catch {
        /* ignore */
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, [profile.email, t, toast]);

  useEffect(() => {
    if (!activeId) return;
    let on = true;
    const load = () => {
      fetch(`/api/messages/threads/${activeId}`)
        .then((r) => r.json())
        .then((d) => {
          if (on) setMessages(d.messages ?? []);
        })
        .catch(() => on && setMessages([]));
    };
    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      on = false;
      window.clearInterval(timer);
    };
  }, [activeId]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("member:chromeless", {
        detail: { chromeless: mobileConversation && Boolean(activeId) },
      }),
    );
    const rn = (
      window as Window & {
        ReactNativeWebView?: { postMessage: (msg: string) => void };
      }
    ).ReactNativeWebView;
    rn?.postMessage(
      JSON.stringify({
        type: "plaza-chromeless",
        chromeless: mobileConversation && Boolean(activeId),
      }),
    );
    return () => {
      window.dispatchEvent(new CustomEvent("member:chromeless", { detail: { chromeless: false } }));
      rn?.postMessage(JSON.stringify({ type: "plaza-chromeless", chromeless: false }));
    };
  }, [mobileConversation, activeId]);

  const active = useMemo(
    () => threads.find((th) => th.id === activeId) ?? null,
    [threads, activeId],
  );

  async function sendMessage(bodyOverride?: string) {
    if (!activeId) return;
    const body = (bodyOverride ?? draft).trim();
    if (!body) return;
    const res = await fetch(`/api/messages/threads/${activeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not send message") });
      return;
    }
    const data = await res.json();
    setMessages((prev) => [...prev, data.message]);
    setDraft("");
    await loadThreads();
  }

  function attachMessage(kind: "file" | "image") {
    const body =
      kind === "file"
        ? `${FILE_PREFIX}invoice #00413]`
        : `${IMAGE_PREFIX}/brand/service-hero.png]`;
    void sendMessage(body).then(() => setBookingIntent(false));
  }

  async function startDm(entry: DirectoryEntry) {
    const res = await fetch("/api/messages/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "dm", toEmail: entry.email, toName: entry.name }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not start chat") });
      return;
    }
    const data = await res.json();
    setShowNew(null);
    await loadThreads();
    setActiveId(data.thread.id);
    setMobileConversation(true);
  }

  async function createGroup() {
    const members = selectedMembers.map((d) => ({ email: d.email, name: d.name }));
    if (members.length === 0) {
      toast({ variant: "warning", title: t("Select at least one member") });
      return;
    }
    const res = await fetch("/api/messages/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "group", title: groupTitle, members }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not create group") });
      return;
    }
    const data = await res.json();
    setShowNew(null);
    setGroupTitle("");
    setSelectedMembers([]);
    setMemberQuery("");
    await loadThreads();
    setActiveId(data.thread.id);
    setMobileConversation(true);
  }

  const directoryMatches = useMemo(() => {
    const hubRank = new Map<string, number>(
      OCEANSIDE_MESSAGE_HUB_EMAILS.map((email, i) => [email, i]),
    );
    const sorted = [...directory].sort((a, b) => {
      const ar = hubRank.get(a.email.toLowerCase());
      const br = hubRank.get(b.email.toLowerCase());
      if (ar != null && br != null) return ar - br;
      if (ar != null) return -1;
      if (br != null) return 1;
      if (Boolean(a.isManagement) !== Boolean(b.isManagement)) {
        return a.isManagement ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    const q = memberQuery.trim().toLowerCase();
    if (!q) return sorted.slice(0, 12);
    return sorted
      .filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.email.toLowerCase().includes(q) ||
          (d.role ?? "").toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [directory, memberQuery]);

  function openThread(id: string) {
    setActiveId(id);
    setMobileConversation(true);
  }

  function closeConversation() {
    setMobileConversation(false);
  }

  const showConversationPane = Boolean(active);

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      {/* Mobile conversation — Figma full-screen chat */}
      {active && mobileConversation ? (
        <div className="fixed inset-0 z-40 mx-auto flex max-w-lg flex-col bg-[#f2f2f7] lg:hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-[#e5e5ea] bg-white/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
            <button
              type="button"
              onClick={closeConversation}
              className="rounded-lg p-1.5 text-black hover:bg-slate-100"
              aria-label={t("Back")}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold text-black">
              {active.title}
            </h1>
            <span className="w-9" />
          </div>
          <ChatThreadScroll
            scrollKey={`${activeId}-${messages.length}-${messages.at(-1)?.id ?? ""}`}
          >
            {messages.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#8e8e93]">
                {t("Conversation")}
              </p>
            ) : (
              <>
                <p className="pb-1 text-center text-[11px] font-medium text-[#8e8e93]">
                  {messages[0] ? relativeTime(messages[0].createdAt) : null}
                </p>
                {messages.map((m) => {
                  const mine = m.authorEmail === profile.email;
                  return (
                    <div
                      key={m.id}
                      className={cn("flex flex-col", mine ? "items-end" : "items-start")}
                    >
                      <MessageBody body={m.body} mine={mine} />
                    </div>
                  );
                })}
              </>
            )}
          </ChatThreadScroll>
          <ChatComposer
            value={draft}
            onChange={(v) => {
              setDraft(v);
              if (!v.trim()) setBookingIntent(false);
            }}
            onSend={async () => {
              await sendMessage();
              setBookingIntent(false);
            }}
            placeholder={t("Message")}
            banner={
              bookingIntent && draft.trim() ? (
                <div className="mb-2 rounded-2xl border border-[var(--mvp-blue)]/20 bg-[var(--mvp-blue)]/5 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--mvp-blue)]">
                    {t("Booking request")}
                  </p>
                  <p className="mt-1 text-[13px] leading-snug text-ink">{draft}</p>
                </div>
              ) : null
            }
            leading={
              <>
                <button
                  type="button"
                  onClick={() => attachMessage("file")}
                  className="rounded-full p-2"
                  aria-label={t("Attach file")}
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => attachMessage("image")}
                  className="rounded-full p-2"
                  aria-label={t("Add photo")}
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
              </>
            }
          />
        </div>
      ) : null}

      {/* Thread list (mobile when not in conversation; always on desktop left) */}
      <div
        className={cn(
          "mx-auto max-w-lg px-4 pb-28 pt-4 lg:max-w-5xl lg:px-6 lg:pb-10",
          active && mobileConversation && "hidden lg:block",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-[21px] font-medium text-black">{t("Messages")}</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowNew("dm")}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              {t("New")}
            </button>
            <button
              type="button"
              onClick={() => setShowNew("group")}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border-2 px-3 text-sm font-medium text-black"
            >
              <BrandIcon name="Users" className="h-4 w-4" />
              {t("Group")}
            </button>
          </div>
        </div>

        {showNew ? (
          <div className="mb-4 rounded-xl border border-border-2 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-black">
                {showNew === "dm" ? t("Message a neighbor") : t("Create a group chat")}
              </h3>
              <button
                type="button"
                className="text-sm text-grey"
                onClick={() => {
                  setShowNew(null);
                  setSelectedMembers([]);
                  setMemberQuery("");
                  setGroupTitle("");
                }}
              >
                {t("Cancel")}
              </button>
            </div>
            {showNew === "group" ? (
              <>
                <input
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder={t("Group name")}
                  className="mb-3 h-10 w-full rounded-lg border border-border-2 px-3 text-sm"
                />
                <InviteMemberPicker
                  label={t("Add members")}
                  placeholder={t("Search members…")}
                  selected={selectedMembers}
                  onChange={setSelectedMembers}
                  excludeEmail={profile.email}
                  directoryHref="/api/directory"
                />
                <button
                  type="button"
                  onClick={() => void createGroup()}
                  className="mt-3 h-10 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-medium text-white"
                >
                  {t("Create group")}
                </button>
              </>
            ) : (
              <>
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder={t("Search members…")}
                  className="mb-3 h-10 w-full rounded-lg border border-border-2 px-3 text-sm"
                  autoFocus
                />
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {directoryMatches.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-grey">{t("No members found")}</p>
                  ) : (
                    directoryMatches.map((d) => (
                      <button
                        key={d.email}
                        type="button"
                        onClick={() => void startDm(d)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#f6f9fc]"
                      >
                        <Avatar name={d.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-black">{d.name}</p>
                          <p className="truncate text-[11px] text-grey">
                            {d.role ? `${d.role} · ${d.email}` : d.email}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="overflow-hidden rounded-xl border border-border-2 bg-white">
            {loading ? (
              <p className="p-4 text-sm text-grey">{t("Loading…")}</p>
            ) : threads.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-grey">{t("No conversations yet.")}</p>
                <button
                  type="button"
                  onClick={() => setShowNew("dm")}
                  className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  {t("Message a neighbor")}
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-border-2">
                {threads.map((th) => (
                  <li key={th.id}>
                    <button
                      type="button"
                      onClick={() => openThread(th.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-[#fafafa]",
                        activeId === th.id && "bg-[#f6f9fc]",
                      )}
                    >
                      <Avatar name={th.title} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-black">{th.title}</p>
                          <span className="shrink-0 text-[11px] text-grey">
                            {relativeTime(th.lastAt)}
                          </span>
                        </div>
                        {th.lastMessage ? (
                          <p className="mt-0.5 line-clamp-2 text-sm text-grey">{th.lastMessage}</p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Desktop conversation pane */}
          <div className="hidden min-h-[520px] flex-col overflow-hidden rounded-xl border border-border-2 bg-[#f2f2f7] lg:flex">
            {showConversationPane && active ? (
              <>
                <div className="shrink-0 border-b border-[#e5e5ea] bg-white px-5 py-4">
                  <h2 className="font-medium text-black">{active.title}</h2>
                  <p className="text-xs text-grey">{active.participantNames.join(", ")}</p>
                </div>
                <ChatThreadScroll scrollKey={`${activeId}-${messages.length}`}>
                  {messages.map((m) => {
                    const mine = m.authorEmail === profile.email;
                    return (
                      <div
                        key={m.id}
                        className={cn("flex flex-col", mine ? "items-end" : "items-start")}
                      >
                        <MessageBody body={m.body} mine={mine} />
                      </div>
                    );
                  })}
                </ChatThreadScroll>
                <ChatComposer
                  value={draft}
                  onChange={(v) => {
                    setDraft(v);
                    if (!v.trim()) setBookingIntent(false);
                  }}
                  onSend={async () => {
                    await sendMessage();
                    setBookingIntent(false);
                  }}
                  placeholder={t("Message")}
                  banner={
                    bookingIntent && draft.trim() ? (
                      <div className="mb-2 rounded-2xl border border-[var(--mvp-blue)]/20 bg-[var(--mvp-blue)]/5 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--mvp-blue)]">
                          {t("Booking request")}
                        </p>
                        <p className="mt-1 text-[13px] leading-snug text-ink">{draft}</p>
                      </div>
                    ) : null
                  }
                  leading={
                    <>
                      <button
                        type="button"
                        onClick={() => attachMessage("file")}
                        className="rounded-full p-2"
                        aria-label={t("Attach file")}
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => attachMessage("image")}
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
              <p className="flex flex-1 items-center justify-center text-sm text-grey">
                {t("Select a conversation or start a new one.")}
              </p>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}
