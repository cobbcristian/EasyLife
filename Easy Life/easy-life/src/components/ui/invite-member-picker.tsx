"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn, getInitials } from "@/lib/utils";

export type InviteMember = { id: string; name: string; email: string };

export function InviteMemberPicker({
  selected,
  onChange,
  excludeEmail,
  label,
  placeholder,
  directoryHref = "/api/member/directory",
  maxSelected,
  allowExternalEmail = false,
  className,
}: {
  selected: InviteMember[];
  onChange: (members: InviteMember[]) => void;
  excludeEmail?: string;
  label?: string;
  placeholder?: string;
  directoryHref?: string;
  maxSelected?: number;
  /** Allow typing an email for non-members (guest rate). */
  allowExternalEmail?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const [members, setMembers] = useState<InviteMember[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(directoryHref)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.members)) {
          setMembers(d.members);
          return;
        }
        if (Array.isArray(d.directory)) {
          setMembers(
            d.directory
              .filter((m: { email?: string; visible?: boolean }) => m.email && m.visible !== false)
              .map((m: { id?: string; name: string; email: string }) => ({
                id: m.id || m.email,
                name: m.name,
                email: m.email,
              })),
          );
        }
      })
      .catch(() => {});
  }, [directoryHref]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return members
      .filter((m) => {
        if (excludeEmail && m.email.toLowerCase() === excludeEmail.toLowerCase()) {
          return false;
        }
        if (selectedIds.has(m.id)) return false;
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [members, query, excludeEmail, selectedIds]);

  function add(member: InviteMember) {
    if (maxSelected === 1) {
      onChange([member]);
    } else if (!selectedIds.has(member.id)) {
      if (maxSelected !== undefined && selected.length >= maxSelected) return;
      onChange([...selected, member]);
    }
    setQuery("");
    setOpen(false);
  }

  function addExternalEmail() {
    if (!allowExternalEmail) return;
    const email = query.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (excludeEmail && email === excludeEmail.toLowerCase()) return;
    if (selected.some((s) => s.email.toLowerCase() === email)) {
      setQuery("");
      setOpen(false);
      return;
    }
    if (maxSelected !== undefined && selected.length >= maxSelected) return;
    const local = email.split("@")[0] ?? email;
    add({
      id: `ext:${email}`,
      email,
      name: local.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    });
  }

  function remove(id: string) {
    onChange(selected.filter((s) => s.id !== id));
  }

  const atMax =
    maxSelected !== undefined && selected.length >= maxSelected && maxSelected > 0;
  const externalCandidate =
    allowExternalEmail &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim()) &&
    !suggestions.some((s) => s.email.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={containerRef} className={className}>
      {label ? (
        <p className="mb-3 text-sm font-medium text-black">{label}</p>
      ) : null}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-grey" />
        <input
          className="h-12 w-full rounded-lg border border-border-2 bg-white py-2 pl-10 pr-4 text-sm text-ink placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)] disabled:cursor-not-allowed disabled:bg-slate-50"
          placeholder={placeholder ?? t("Invite Members")}
          value={query}
          disabled={atMax}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && externalCandidate) {
              e.preventDefault();
              addExternalEmail();
            }
          }}
          aria-autocomplete="list"
          aria-expanded={open && (suggestions.length > 0 || externalCandidate)}
          role="combobox"
          aria-controls="invite-member-suggestions"
        />
        {open && query.trim() && (suggestions.length > 0 || externalCandidate) ? (
          <ul
            id="invite-member-suggestions"
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border border-border-2 bg-white py-1 shadow-lg"
          >
            {suggestions.map((m) => (
              <li key={m.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(m)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f4fc] text-xs font-semibold text-[var(--mvp-blue)]">
                    {getInitials(m.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {m.name}
                    </span>
                    <span className="block truncate text-xs text-grey">{m.email}</span>
                  </span>
                </button>
              </li>
            ))}
            {externalCandidate ? (
              <li role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={addExternalEmail}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff4e5] text-xs font-semibold text-[#f99f25]">
                    @
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {t("Invite non-member")}
                    </span>
                    <span className="block truncate text-xs text-grey">
                      {query.trim().toLowerCase()} · {t("pays double")}
                    </span>
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
        {open &&
        query.trim() &&
        suggestions.length === 0 &&
        !externalCandidate ? (
          <p className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border-2 bg-white px-3 py-2.5 text-sm text-grey shadow-lg">
            {allowExternalEmail
              ? t("Type a full email to invite a non-member.")
              : t("No members match your search.")}
          </p>
        ) : null}
      </div>
      {selected.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {selected.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mvp-blue)] text-sm font-medium text-white">
                {getInitials(m.name)}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm text-black">{m.name}</span>
              <button
                type="button"
                onClick={() => remove(m.id)}
                className={cn(
                  "ml-auto shrink-0 rounded p-1 text-grey hover:bg-slate-100",
                )}
                aria-label={t("Remove {{name}}").replace("{{name}}", m.name)}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
