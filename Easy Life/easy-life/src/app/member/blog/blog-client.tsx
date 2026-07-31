"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export interface BlogDTO {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  createdAt: string;
}

interface Comment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

const fieldClass =
  "h-12 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm text-ink outline-none focus:border-[var(--mvp-blue)]";

export function BlogClient({ initial }: { initial: BlogDTO[]; userName: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", excerpt: "", category: "Community" });
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSourceId, setCommentSourceId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  if (expandedId !== commentSourceId) {
    setCommentSourceId(expandedId);
    setComments([]);
    setCommentsLoading(Boolean(expandedId));
  }

  useEffect(() => {
    if (!expandedId) return;
    let on = true;
    fetch(`/api/blog/${expandedId}/comments`)
      .then((r) => r.json())
      .then((d) => {
        if (on) setComments(d.comments ?? []);
      })
      .catch(() => on && setComments([]))
      .finally(() => on && setCommentsLoading(false));
    return () => {
      on = false;
    };
  }, [expandedId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.excerpt) {
      toast({ variant: "warning", title: t("Title and summary required") });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not publish") });
      return;
    }
    toast({ variant: "success", title: t("Post published") });
    setForm({ title: "", excerpt: "", category: "Community" });
    setOpen(false);
    router.refresh();
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!expandedId || !commentDraft.trim()) return;
    const res = await fetch(`/api/blog/${expandedId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentDraft.trim() }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not post comment") });
      return;
    }
    const data = await res.json();
    setComments((prev) => [...prev, data.comment]);
    setCommentDraft("");
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
              {t("Member")}
            </p>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
              {t("Blog")}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
          >
            <PenLine className="h-4 w-4" />
            {open ? t("Close") : t("Write")}
          </button>
        </header>

        <div className="space-y-4 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          {open ? (
            <form className="space-y-3 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4" onSubmit={submit}>
              <input
                className={fieldClass}
                placeholder={t("Title")}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <textarea
                className="min-h-[90px] w-full rounded-2xl border border-[#e4e8ee] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--mvp-blue)]"
                placeholder={t("Summary")}
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              />
              <input
                className={fieldClass}
                placeholder={t("Category")}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? t("Publishing...") : t("Publish")}
              </button>
            </form>
          ) : null}

          {initial.length === 0 ? (
            <div className="rounded-xl bg-[#f7f8fa] p-5">
              <p className="text-sm font-semibold text-ink">{t("No posts yet.")}</p>
              <p className="mt-1 text-sm text-grey">
                {t("Share club news, tips, or event recaps with neighbors.")}
              </p>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-4 inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
              >
                {t("Write a post")}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#eceff3]">
              {initial.map((post) => (
                <li key={post.id} className="py-4 first:pt-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--mvp-blue)]">
                    {post.category}
                  </p>
                  <h2 className="mt-1 text-[16px] font-semibold text-ink">{post.title}</h2>
                  <p className="mt-1 text-sm text-grey">{post.excerpt}</p>
                  <p className="mt-2 text-[12px] text-grey">
                    {post.author} · {formatDate(post.createdAt)}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-[12px] font-semibold text-[var(--mvp-blue)]"
                    onClick={() => {
                      setExpandedId((current) => (current === post.id ? null : post.id));
                      setCommentDraft("");
                    }}
                  >
                    {expandedId === post.id ? t("Hide comments") : t("Comments")}
                  </button>
                  {expandedId === post.id ? (
                    <div className="mt-3 space-y-3 rounded-2xl bg-[#fafbfc] p-3">
                      {commentsLoading ? (
                        <p className="text-sm text-grey">{t("Loading…")}</p>
                      ) : comments.length === 0 ? (
                        <p className="text-sm text-grey">{t("No comments yet.")}</p>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className="flex gap-2.5">
                            <Avatar name={c.author} size="sm" />
                            <div>
                              <p className="text-[12px] font-semibold text-ink">{c.author}</p>
                              <p className="text-sm text-ink">{c.body}</p>
                            </div>
                          </div>
                        ))
                      )}
                      <form onSubmit={submitComment} className="flex gap-2">
                        <input
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          placeholder={t("Add a comment...")}
                          className="h-10 flex-1 rounded-xl border border-[#e4e8ee] bg-white px-3 text-sm outline-none focus:border-[var(--mvp-blue)]"
                        />
                        <button
                          type="submit"
                          className="h-10 rounded-xl bg-[var(--mvp-blue)] px-3 text-[12px] font-semibold text-white"
                        >
                          {t("Post")}
                        </button>
                      </form>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
