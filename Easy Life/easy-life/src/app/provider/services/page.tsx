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

interface ServiceCard {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  image: string;
}

function defaultServiceImage(name: string): string {
  const key = name.toLowerCase();
  if (key.includes("edging") || key.includes("line trim")) return brandAssets.serviceLawnEdging;
  if (key.includes("hedge")) return brandAssets.serviceLawnHedge;
  if (key.includes("brush")) return brandAssets.serviceLawnBrush;
  if (key.includes("forestry") || key.includes("mulch")) return brandAssets.serviceLawnMulching;
  if (key.includes("debris") || key.includes("storm")) return brandAssets.serviceLawnDebris;
  if (key.includes("lawn") || key.includes("landscape") || key.includes("mow")) {
    return brandAssets.serviceLandscaping;
  }
  if (key.includes("carpet")) return brandAssets.bookingThumbCarpet;
  if (key.includes("clean")) return brandAssets.bookingThumbCleaning;
  return brandAssets.serviceHero;
}

/** Prefer name-matched lawn thumbs over stale DB URLs (dining/cleaning mis-seeds). */
function resolveServiceImage(name: string, image: string | null): string {
  const key = name.toLowerCase();
  const isLawn =
    key.includes("lawn") ||
    key.includes("hedge") ||
    key.includes("brush") ||
    key.includes("mulch") ||
    key.includes("debris") ||
    key.includes("edging") ||
    key.includes("forestry") ||
    key.includes("landscape") ||
    key.includes("mow");
  if (isLawn) return defaultServiceImage(name);
  return image || defaultServiceImage(name);
}

/** Figma Service Services + hard press + Edit Service (4616:14980, 4703:9244). */
export default function ProviderServicesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const profile = useSessionProfile();
  const [services, setServices] = useState<ServiceCard[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCard | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function reload() {
    const res = await fetch("/api/provider/offerings?kind=service");
    const data = await res.json();
    setServices(
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
          image: resolveServiceImage(o.name, o.image),
        }),
      ),
    );
  }

  useEffect(() => {
    let on = true;
    fetch("/api/provider/offerings?kind=service")
      .then((r) => r.json())
      .then((data) => {
        if (!on) return;
        setServices(
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
              image: resolveServiceImage(o.name, o.image),
            }),
          ),
        );
      })
      .catch(() => {
        if (on) setServices([]);
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
      : "Est";
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
        kind: "service",
        priceLabel,
        priceCents,
        imageUrl: payload.image,
      }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not save service") });
      return;
    }
    toast({
      variant: "success",
      title: editing ? t("Service updated") : t("Service added"),
    });
    setEditing(null);
    setAddOpen(false);
    await reload();
  }

  async function deleteService(id: string) {
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
    toast({ variant: "info", title: t("Service deleted") });
    await reload();
  }

  function openMenu(service: ServiceCard, clientX: number, clientY: number) {
    setPressedId(service.id);
    setMenu({ id: service.id, x: clientX, y: clientY });
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ProviderContentHeader title={t("Services")} avatarName={profile.name} />
      <PageBody>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium text-black">
            {t("Your Services")}{" "}
            <span className="text-[var(--mvp-blue)]">{services.length}</span>
          </h2>
          <AddServiceTrigger onClick={() => setAddOpen(true)} />
        </div>

        <ul className="grid gap-6 md:grid-cols-2">
          {services.length === 0 ? (
            <li className="rounded-xl border border-border-2 bg-white px-5 py-10 text-center md:col-span-2">
              <p className="text-sm text-grey">{t("No services listed yet.")}</p>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
              >
                {t("Add service")}
              </button>
            </li>
          ) : (
            services.map((service) => (
              <li key={service.id}>
                <button
                  type="button"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openMenu(service, e.clientX, e.clientY);
                  }}
                  onPointerDown={(e) => {
                    if (e.pointerType === "touch") {
                      pressTimer.current = setTimeout(() => {
                        openMenu(service, e.clientX, e.clientY);
                      }, 500);
                    }
                  }}
                  onPointerUp={() => {
                    if (pressTimer.current) clearTimeout(pressTimer.current);
                  }}
                  onPointerLeave={() => {
                    if (pressTimer.current) clearTimeout(pressTimer.current);
                  }}
                  onClick={() => setEditing(service)}
                  className={cn(
                    "flex w-full gap-4 rounded-xl p-2 text-left transition",
                    pressedId === service.id || editing?.id === service.id
                      ? "border border-[var(--mvp-blue)] bg-white shadow-[0_4px_16px_rgba(0,122,255,0.12)]"
                      : "border border-transparent hover:bg-[#fafafa]",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={service.image}
                    alt=""
                    className="h-[70px] w-[70px] shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-black">{service.name}</p>
                    <p className="mt-1 text-xs leading-snug text-grey">{service.description}</p>
                  </div>
                  <p className="shrink-0 self-center text-sm font-medium text-black">
                    {service.priceLabel}
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
              const svc = services.find((s) => s.id === menu.id);
              if (svc) setEditing(svc);
              setMenu(null);
            }}
          >
            {t("Edit")}
          </button>
          <button
            type="button"
            className="block w-full px-4 py-2.5 text-left text-sm text-[#ff3b30] hover:bg-[#fff5f5]"
            onClick={() => deleteService(menu.id)}
          >
            {t("Delete")}
          </button>
        </div>
      ) : null}

      <ProviderAddServiceSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
      />

      <ProviderAddServiceSheet
        open={!!editing}
        title={t("Edit Service")}
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
        onDelete={editing ? () => deleteService(editing.id) : undefined}
      />
    </div>
  );
}
