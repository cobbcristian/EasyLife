"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { imageForProviderCategory } from "@/lib/brand-assets";
import type { Provider } from "@/lib/types";

type ProviderWithCommunity = Provider & { community: string };

function ConfirmDelete({
  name,
  open,
  onCancel,
  onConfirm,
  loading,
  t,
}: {
  name: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
  t: (key: string) => string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onCancel} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-ink">{t("Remove provider?")}</h3>
        <p className="mt-2 text-sm text-grey">
          <span className="font-medium text-ink">{name}</span>{" "}
          {t("will be removed from the directory. This cannot be undone.")}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {t("Cancel")}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? t("Removing…") : t("Remove")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProviderGrid({ providers }: { providers: ProviderWithCommunity[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [pending, setPending] = useState<ProviderWithCommunity | null>(null);
  const [loading, setLoading] = useState(false);

  async function confirmDelete() {
    if (!pending) return;
    setLoading(true);
    const res = await fetch(`/api/providers/${pending.id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not remove provider") });
      return;
    }
    toast({ variant: "success", title: t("Provider removed") });
    setPending(null);
    router.refresh();
  }

  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => {
          const thumb =
            provider.imageUrl ??
            imageForProviderCategory(provider.category, provider.type, provider.name);
          return (
            <div
              key={provider.id}
              className="rounded-xl border border-border-1 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-start justify-between gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover"
                />
                <div className="flex items-center gap-2">
                  {provider.rating ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-ink">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {provider.rating.toFixed(1)}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setPending(provider)}
                    className="rounded-md p-1.5 text-grey hover:bg-red-50 hover:text-danger"
                    aria-label={`Remove ${provider.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm font-bold text-ink">{provider.name}</p>
              <p className="text-xs text-grey">{t(provider.category)}</p>
              <div className="mt-3">
                <Badge variant="info">{provider.community}</Badge>
              </div>
            </div>
          );
        })}
      </div>
      <ConfirmDelete
        name={pending?.name ?? ""}
        open={!!pending}
        onCancel={() => setPending(null)}
        onConfirm={confirmDelete}
        loading={loading}
        t={t}
      />
    </>
  );
}
