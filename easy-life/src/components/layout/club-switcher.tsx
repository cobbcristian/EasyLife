"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Membership = {
  id: string;
  communityId: string;
  communityName: string;
  logoUrl: string | null;
  role: string;
  isPrimary: boolean;
};

export function ClubSwitcher({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [communityId, setCommunityId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/memberships");
    if (!res.ok) return;
    const data = await res.json();
    setMemberships(data.memberships ?? []);
    setActiveId(data.activeCommunityId ?? null);
  }

  useEffect(() => {
    void load();
  }, []);

  if (memberships.length < 2 && !joinOpen) {
    // Still show a discreet join control when only one club
    return (
      <div className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => setJoinOpen(true)}
          className="text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          Join another club
        </button>
        {joinOpen ? (
          <JoinForm
            communityId={communityId}
            inviteCode={inviteCode}
            error={error}
            busy={busy}
            onCommunityId={setCommunityId}
            onInviteCode={setInviteCode}
            onCancel={() => {
              setJoinOpen(false);
              setError(null);
            }}
            onSubmit={async () => {
              setBusy(true);
              setError(null);
              const res = await fetch("/api/memberships", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ communityId, inviteCode }),
              });
              const data = await res.json().catch(() => ({}));
              setBusy(false);
              if (!res.ok) {
                setError(typeof data.error === "string" ? data.error : "Could not join");
                return;
              }
              setJoinOpen(false);
              setCommunityId("");
              setInviteCode("");
              await load();
            }}
          />
        ) : null}
      </div>
    );
  }

  const active =
    memberships.find((m) => m.communityId === activeId) ?? memberships[0];

  async function switchTo(nextId: string) {
    if (nextId === activeId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/memberships/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: nextId }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Switch failed");
      return;
    }
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50",
          compact && "px-2 py-1 text-xs",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="max-w-[10rem] truncate">
          {active?.communityName ?? "Club"}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-500" />
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Your clubs
          </p>
          <ul role="listbox" className="max-h-56 overflow-auto">
            {memberships.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={m.communityId === active?.communityId}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50",
                    m.communityId === active?.communityId && "bg-slate-100 font-semibold",
                  )}
                  onClick={() => void switchTo(m.communityId)}
                >
                  <span className="truncate">{m.communityName}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-1 w-full rounded-lg px-2 py-2 text-left text-xs font-medium text-[#007aff] hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              setJoinOpen(true);
            }}
          >
            + Join another club
          </button>
          {error ? <p className="px-2 pt-1 text-xs text-red-600">{error}</p> : null}
        </div>
      ) : null}
      {joinOpen ? (
        <JoinForm
          communityId={communityId}
          inviteCode={inviteCode}
          error={error}
          busy={busy}
          onCommunityId={setCommunityId}
          onInviteCode={setInviteCode}
          onCancel={() => {
            setJoinOpen(false);
            setError(null);
          }}
          onSubmit={async () => {
            setBusy(true);
            setError(null);
            const res = await fetch("/api/memberships", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ communityId, inviteCode }),
            });
            const data = await res.json().catch(() => ({}));
            setBusy(false);
            if (!res.ok) {
              setError(typeof data.error === "string" ? data.error : "Could not join");
              return;
            }
            setJoinOpen(false);
            setCommunityId("");
            setInviteCode("");
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function JoinForm(props: {
  communityId: string;
  inviteCode: string;
  error: string | null;
  busy: boolean;
  onCommunityId: (v: string) => void;
  onInviteCode: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="text-sm font-semibold text-slate-900">Join another club</p>
      <p className="mt-1 text-xs text-slate-500">
        Same login — add a second community with its invite code.
      </p>
      <label className="mt-3 block text-xs font-medium text-slate-600">
        Community ID
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          value={props.communityId}
          onChange={(e) => props.onCommunityId(e.target.value)}
          placeholder="e.g. golden-ocala"
        />
      </label>
      <label className="mt-2 block text-xs font-medium text-slate-600">
        Invite code
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          value={props.inviteCode}
          onChange={(e) => props.onInviteCode(e.target.value)}
        />
      </label>
      {props.error ? (
        <p className="mt-2 text-xs text-red-600">{props.error}</p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          onClick={props.onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={props.busy}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          onClick={() => void props.onSubmit()}
        >
          Join
        </button>
      </div>
    </div>
  );
}
