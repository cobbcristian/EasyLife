"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, Heart, ImagePlus, MessageCircle, Send, UserX } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { AddEventSheet } from "@/components/member/add-event-sheet";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/member-data";

interface Message {
  id: string;
  author: string;
  body: string;
  createdAt?: string;
}

interface Post {
  id: string;
  authorName: string;
  authorEmail?: string;
  body: string;
  imageUrl?: string | null;
  eventId: string | null;
  likeCount: number;
  likedByMe: boolean;
  comments: Array<{ id: string; authorName: string; body: string }>;
  createdAt: string;
}

export default function MemberGroupsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [groupState, setGroupState] = useState<Group[]>([]);
  const [active, setActive] = useState<Group | null>(null);
  const [tab, setTab] = useState<"chat" | "posts">("posts");
  const [messages, setMessages] = useState<Message[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [messagesForId, setMessagesForId] = useState<string | null>(null);
  const [postsForId, setPostsForId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [postDraft, setPostDraft] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [attachEvent, setAttachEvent] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [postImageUrl, setPostImageUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const activeId = active?.id ?? null;
  if (activeId !== messagesForId) {
    setMessagesForId(activeId);
    setMessages([]);
    setMessagesLoading(Boolean(activeId));
  }
  if (activeId !== postsForId) {
    setPostsForId(activeId);
    setPosts([]);
    setPostsLoading(Boolean(activeId));
  }

  useEffect(() => {
    let on = true;
    fetch("/api/groups")
      .then((r) => r.json())
      .then((groupsData) => {
        if (!on) return;
        const groups: Group[] = groupsData.groups ?? [];
        setGroupState(groups);
        setActive(groups.find((g) => g.joined) ?? groups[0] ?? null);
      })
      .catch(() => {})
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let on = true;
    fetch(`/api/groups/${activeId}/messages`)
      .then((r) => r.json())
      .then((d) => {
        if (on) setMessages(d.messages ?? []);
      })
      .catch(() => on && setMessages([]))
      .finally(() => on && setMessagesLoading(false));
    return () => {
      on = false;
    };
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    let on = true;
    fetch(`/api/groups/${activeId}/posts`)
      .then((r) => r.json())
      .then((d) => {
        if (on) setPosts(d.posts ?? []);
      })
      .catch(() => on && setPosts([]))
      .finally(() => on && setPostsLoading(false));
    return () => {
      on = false;
    };
  }, [activeId]);

  async function toggleJoin(group: Group) {
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: group.id,
        action: group.joined ? "leave" : "join",
      }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not update membership") });
      return;
    }
    const data = await res.json();
    setGroupState((prev) => prev.map((g) => (g.id === group.id ? data.group : g)));
    if (active?.id === group.id) setActive(data.group);
    toast({
      variant: "info",
      title: group.joined ? t(`Left ${group.name}`) : t(`Joined ${group.name}`),
    });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !active) return;
    const res = await fetch(`/api/groups/${active.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft.trim() }),
    });
    if (res.ok) {
      const d = await res.json();
      setMessages((prev) => [...prev, d.message]);
      setDraft("");
    } else {
      toast({ variant: "warning", title: t("Could not send") });
    }
  }

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    if ((!postDraft.trim() && !postImageUrl) || !active) return;
    if (attachEvent) {
      setEventOpen(true);
      return;
    }
    const res = await fetch(`/api/groups/${active.id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        text: postDraft.trim(),
        imageUrl: postImageUrl,
      }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not create post") });
      return;
    }
    setPostDraft("");
    setPostImageUrl(null);
    const list = await fetch(`/api/groups/${active.id}/posts`).then((r) => r.json());
    setPosts(list.posts ?? []);
    toast({ variant: "success", title: t("Post created") });
  }

  async function uploadPostPhoto(file: File) {
    setUploadingPhoto(true);
    const form = new FormData();
    form.set("file", file);
    form.set("title", "Group post photo");
    form.set("category", "Group Posts");
    const res = await fetch("/api/gallery", { method: "POST", body: form });
    setUploadingPhoto(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({
        variant: "warning",
        title: t("Could not upload photo"),
        description: data.error,
      });
      return;
    }
    const data = await res.json();
    const url = data.image?.url as string | undefined;
    if (url) setPostImageUrl(url);
  }

  async function moderatePost(
    post: Post,
    action: "report" | "block",
  ) {
    if (!active) return;
    const res = await fetch(`/api/groups/${active.id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        postId: post.id,
        targetName: post.authorName,
        targetEmail: post.authorEmail,
      }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not submit") });
      return;
    }
    toast({
      variant: "success",
      title: action === "report" ? t("Post reported") : t("Member blocked"),
    });
  }

  async function likePost(postId: string) {
    if (!active) return;
    await fetch(`/api/groups/${active.id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "like", postId }),
    });
    const list = await fetch(`/api/groups/${active.id}/posts`).then((r) => r.json());
    setPosts(list.posts ?? []);
  }

  async function commentPost(postId: string) {
    if (!active) return;
    const text = commentDrafts[postId]?.trim();
    if (!text) return;
    await fetch(`/api/groups/${active.id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", postId, text }),
    });
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    const list = await fetch(`/api/groups/${active.id}/posts`).then((r) => r.json());
    setPosts(list.posts ?? []);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-[family-name:var(--font-poppins)]">
        <p className="text-sm text-grey">{t("Loading…")}</p>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center font-[family-name:var(--font-poppins)]">
        <p className="text-base font-semibold text-ink">{t("No groups yet")}</p>
        <p className="max-w-sm text-sm text-grey">
          {t("Community groups will appear here once they are available.")}
        </p>
        <a
          href="/member/messages"
          className="mt-2 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
        >
          {t("Message a neighbor")}
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto flex w-full max-w-lg flex-col md:max-w-3xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
            {t("Member")}
          </p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {t("Groups")}
          </h1>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {groupState.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActive(g)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold",
                  active.id === g.id
                    ? "bg-[var(--mvp-blue)] text-white"
                    : "bg-[#f2f4f7] text-ink",
                )}
              >
                {g.name}
                {!g.joined ? (
                  <span className="ml-1 opacity-80">· {t("Join")}</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="mt-3 flex rounded-full bg-[#f2f4f7] p-1">
            {(["posts", "chat"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTab(mode)}
                className={cn(
                  "flex-1 rounded-full py-2 text-sm font-semibold capitalize",
                  tab === mode ? "bg-white text-ink shadow-sm" : "text-grey",
                )}
              >
                {t(mode === "posts" ? "Posts" : "Chat")}
              </button>
            ))}
          </div>
        </header>

        <div className="flex flex-1 flex-col px-4 py-4 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-semibold text-ink">{active.name}</p>
              <p className="text-[12px] text-grey">
                {active.members} {t("members")}
                {!active.joined ? ` · ${t("Not joined")}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleJoin(active)}
              className={cn(
                "h-9 rounded-full px-3 text-[12px] font-semibold",
                active.joined
                  ? "bg-[#f2f4f7] text-ink"
                  : "bg-[var(--mvp-blue)] text-white",
              )}
            >
              {active.joined ? t("Leave") : t("Join")}
            </button>
          </div>
          {!active.joined ? (
            <div className="mb-4 rounded-xl bg-[#e8f4fc] px-4 py-3 text-sm text-[var(--mvp-blue)]">
              {t("Join this group to post, chat, and see member updates.")}
            </div>
          ) : null}

          {tab === "posts" ? (
            <>
              <form onSubmit={createPost} className="mb-4 space-y-2 rounded-2xl border border-[#e8ebf0] p-3">
                <textarea
                  value={postDraft}
                  onChange={(e) => setPostDraft(e.target.value)}
                  placeholder={t("Create a post...")}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[#e4e8ee] bg-[#fafbfc] px-3 py-2 text-sm outline-none focus:border-[var(--mvp-blue)]"
                />
                {postImageUrl ? (
                  <div className="relative overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={postImageUrl} alt="" className="max-h-48 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPostImageUrl(null)}
                      className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[11px] font-semibold text-white"
                    >
                      {t("Remove")}
                    </button>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-[12px] text-ink">
                      <input
                        type="checkbox"
                        checked={attachEvent}
                        onChange={(e) => setAttachEvent(e.target.checked)}
                      />
                      {t("Add an event")}
                    </label>
                    <button
                      type="button"
                      disabled={uploadingPhoto}
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--mvp-blue)] disabled:opacity-50"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      {uploadingPhoto ? t("Uploading…") : t("Photo")}
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadPostPhoto(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-9 rounded-full bg-[var(--mvp-blue)] px-4 text-[12px] font-semibold text-white"
                  >
                    {t("Create Post")}
                  </button>
                </div>
              </form>

              <div className="min-h-[240px] flex-1 space-y-4 overflow-y-auto pb-3">
                {postsLoading ? (
                  <p className="text-sm text-grey">{t("Loading…")}</p>
                ) : posts.length === 0 ? (
                  <p className="text-sm text-grey">{t("No posts yet — create one!")}</p>
                ) : (
                  posts.map((p) => (
                    <article key={p.id} className="rounded-2xl border border-[#eceff3] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold text-ink">{p.authorName}</p>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            title={t("Report post")}
                            onClick={() => void moderatePost(p, "report")}
                            className="rounded-full p-1.5 text-grey hover:bg-[#f2f4f7]"
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title={t("Block member")}
                            onClick={() => void moderatePost(p, "block")}
                            className="rounded-full p-1.5 text-grey hover:bg-[#f2f4f7]"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {p.body ? (
                        <p className="mt-1 text-sm text-ink">{p.body}</p>
                      ) : null}
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt=""
                          className="mt-2 max-h-64 w-full rounded-xl object-cover"
                        />
                      ) : null}
                      {p.eventId ? (
                        <p className="mt-2 text-[12px] font-medium text-[var(--mvp-blue)]">
                          {t("Event attached")}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => likePost(p.id)}
                          className={cn(
                            "inline-flex items-center gap-1 text-[12px] font-semibold",
                            p.likedByMe ? "text-[#ff3b30]" : "text-grey",
                          )}
                        >
                          <Heart className="h-3.5 w-3.5" fill={p.likedByMe ? "currentColor" : "none"} />
                          {p.likeCount}
                        </button>
                        <span className="inline-flex items-center gap-1 text-[12px] text-grey">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {p.comments.length}
                        </span>
                      </div>
                      {p.comments.length > 0 ? (
                        <ul className="mt-2 space-y-1 border-t border-[#f2f4f7] pt-2">
                          {p.comments.map((c) => (
                            <li key={c.id} className="text-[12px] text-ink">
                              <span className="font-semibold">{c.authorName}</span> {c.body}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-2 flex gap-2">
                        <input
                          value={commentDrafts[p.id] ?? ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          placeholder={t("Add a comment...")}
                          className="h-9 flex-1 rounded-full border border-[#e4e8ee] bg-[#fafbfc] px-3 text-[12px] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => commentPost(p.id)}
                          className="h-9 rounded-full bg-[#f2f4f7] px-3 text-[12px] font-semibold"
                        >
                          {t("Reply")}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="min-h-[240px] flex-1 space-y-3 overflow-y-auto pb-3">
                {messagesLoading ? (
                  <p className="text-sm text-grey">{t("Loading…")}</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-grey">{t("No messages yet — say hello!")}</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="flex gap-2.5">
                      <Avatar name={m.author} size="sm" />
                      <div className="min-w-0 rounded-2xl bg-[#f2f4f7] px-3 py-2">
                        <p className="text-[12px] font-semibold text-ink">{m.author}</p>
                        <p className="text-sm text-ink">{m.body}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={send} className="flex gap-2 border-t border-[#eceff3] pt-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t(`Message ${active.name}...`)}
                  className="h-11 flex-1 rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm outline-none focus:border-[var(--mvp-blue)]"
                />
                <button
                  type="submit"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--mvp-blue)] text-white"
                  aria-label={t("Send")}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <AddEventSheet
        open={eventOpen}
        onClose={() => {
          setEventOpen(false);
          setAttachEvent(false);
          if (postDraft.trim() && active) {
            void fetch(`/api/groups/${active.id}/posts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "create", text: postDraft.trim() }),
            }).then(async () => {
              setPostDraft("");
              const list = await fetch(`/api/groups/${active.id}/posts`).then((r) =>
                r.json(),
              );
              setPosts(list.posts ?? []);
            });
          }
        }}
      />
    </div>
  );
}
