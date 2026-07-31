"use client";

import { useEffect, useRef, useState } from "react";
import { ProviderContentHeader } from "@/components/layout/provider-content-header";
import { PageBody } from "@/components/layout/content-header";
import {
  AddServiceTrigger,
  ProviderAddServiceSheet,
  type NewServicePayload,
} from "@/components/provider/provider-add-service-sheet";
import { brandAssets } from "@/lib/brand-assets";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface ActivityCard {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  image: string;
}

/** Figma Activity Activities + Hard Press (5687:7235, 5692:20017). */
export default function ProviderActivitiesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const profile = useSessionProfile();
  const [activities, setActivities] = useState<ActivityCard[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityCard | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function reload() {
    const res = await fetch("/api/provider/offerings?kind=activity");
    const data = await res.json();
    setActivities(
      (data.offerings ?? []).map(
        (o: {
          id: string;
          name: string;
          description: string;
          priceLabel: string;
          image: string | null;
        }) => ({
          id: o.id,
          name: o.name,
          description: o.description,
          priceLabel: o.priceLabel,
          image: o.image || brandAssets.serviceCourt,
        }),
      ),
    );
  }

  useEffect(() => {
    let on = true;
    fetch("/api/provider/offerings?kind=activity")
      .then((r) => r.json())
      .then((data) => {
        if (!on) return;
        setActivities(
          (data.offerings ?? []).map(
            (o: {
              id: string;
              name: string;
              description: string;
              priceLabel: string;
              image: string | null;
            }) => ({
              id: o.id,
              name: o.name,
              description: o.description,
              priceLabel: o.priceLabel,
              image: o.image || brandAssets.serviceCourt,
            }),
          ),
        );
      })
      .catch(() => {
        if (on) setActivities([]);
      });
    return () => {
      on = false;
    };
  }, []);

  useEffect(() => {
    function close() {
      setMenu(null);
      setPressedId(null);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  async function handleSave(payload: NewServicePayload) {
    const priceLabel = payload.price
      ? payload.price.startsWith("$")
        ? payload.price
        : `$${payload.price}`
      : "Free";
    const priceCents = (() => {
      const raw = payload.price?.replace(/[^0-9.]/g, "") ?? "";
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) ? Math.round(n * 100) : 0;
    })();
    const res = await fetch("/api/provider/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing?.id,
        name: payload.name,
        description: payload.description,
        kind: "activity",
        priceLabel,
        priceCents,
        imageUrl: payload.image,
      }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not save activity") });
      return;
    }
    toast({
      variant: "success",
      title: editing ? t("Activity updated") : t("Activity added"),
    });
    setEditing(null);
    setAddOpen(false);
    await reload();
  }

  async function deleteActivity(id: string) {
    const res = await fetch("/api/provider/offerings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not delete") });
      return;
    }
    setEditing(null);
    setMenu(null);
    toast({ variant: "info", title: t("Activity deleted") });
    await reload();
  }

  function openMenu(activity: ActivityCard, clientX: number, clientY: number) {
    setPressedId(activity.id);
    setMenu({ id: activity.id, x: clientX, y: clientY });
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ProviderContentHeader title={t("Activities")} avatarName={profile.name} />
      <PageBody>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium text-black">
            {t("Your Activities")}{" "}
            <span className="text-[var(--mvp-blue)]">{activities.length}</span>
          </h2>
          <AddServiceTrigger onClick={() => setAddOpen(true)} label={t("Add activity")} />
        </div>

        <ul className="grid gap-6 md:grid-cols-2">
          {activities.length === 0 ? (
            <li className="col-span-full rounded-xl bg-[#f6f9fc] px-5 py-10 text-center">
              <p className="text-sm text-grey">{t("No activities yet.")}</p>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
              >
                {t("Add activity")}
              </button>
            </li>
          ) : (
            activities.map((activity) => (
            <li key={activity.id}>
              <button
                type="button"
                onContextMenu={(e) => {
                  e.preventDefault();
                  openMenu(activity, e.clientX, e.clientY);
                }}
                onPointerDown={(e) => {
                  if (e.pointerType === "touch") {
                    pressTimer.current = setTimeout(() => {
                      openMenu(activity, e.clientX, e.clientY);
                    }, 500);
                  }
                }}
                onPointerUp={() => {
                  if (pressTimer.current) clearTimeout(pressTimer.current);
                }}
                onPointerLeave={() => {
                  if (pressTimer.current) clearTimeout(pressTimer.current);
                }}
                onClick={() => setEditing(activity)}
                className={cn(
                  "flex w-full gap-4 rounded-xl p-2 text-left transition",
                  pressedId === activity.id || editing?.id === activity.id
                    ? "border border-[var(--mvp-blue)] bg-white shadow-[0_4px_16px_rgba(0,122,255,0.12)]"
                    : "border border-transparent hover:bg-[#fafafa]",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activity.image}
                  alt=""
                  className="h-[70px] w-[70px] shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-black">{activity.name}</p>
                  <p className="mt-1 text-xs leading-snug text-grey">
                    {(activity.description ?? "").split("\n\n— Settings —")[0]}
                  </p>
                </div>
                <p className="shrink-0 self-center text-sm font-medium text-black">
                  {activity.priceLabel}
                </p>
              </button>
            </li>
          ))
          )}
        </ul>
      </PageBody>

      {menu ? (
        <div
          className="fixed z-[60] min-w-[160px] overflow-hidden rounded-xl border border-border-2 bg-white py-1 shadow-xl"
          style={{ left: Math.min(menu.x, window.innerWidth - 180), top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="block w-full px-4 py-2.5 text-left text-sm text-black hover:bg-[#f2f2f7]"
            onClick={() => {
              const act = activities.find((a) => a.id === menu.id);
              if (act) setEditing(act);
              setMenu(null);
            }}
          >
            {t("Edit")}
          </button>
          <button
            type="button"
            className="block w-full px-4 py-2.5 text-left text-sm text-[#ff3b30] hover:bg-[#fff5f5]"
            onClick={() => deleteActivity(menu.id)}
          >
            {t("Delete")}
          </button>
        </div>
      ) : null}

      <ProviderAddServiceSheet
        open={addOpen}
        kind="activity"
        title={t("Add New Activity")}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
      />

      <ProviderAddServiceSheet
        open={!!editing}
        kind="activity"
        title={t("Edit Activity")}
        initial={
          editing
            ? {
                name: editing.name,
                price: editing.priceLabel.replace(/^\$/, ""),
                description: editing.description,
                image: editing.image,
              }
            : undefined
        }
        onClose={() => setEditing(null)}
        onSave={handleSave}
        onDelete={editing ? () => deleteActivity(editing.id) : undefined}
      />
    </div>
  );
}
