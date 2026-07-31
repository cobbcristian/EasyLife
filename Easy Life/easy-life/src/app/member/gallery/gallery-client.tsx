"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export interface GalleryDTO {
  id: string;
  title: string;
  category: string;
  url: string;
  createdAt: string;
}

export function GalleryClient({ initial }: { initial: GalleryDTO[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/gallery", { method: "POST", body: form });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast({
          variant: "warning",
          title: t("Upload failed"),
          description: d.error ?? file.name,
        });
      }
    }
    setBusy(false);
    e.target.value = "";
    toast({ variant: "success", title: t("Photos uploaded") });
    router.refresh();
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
              {t("Community Gallery")}
            </h1>
          </div>
          <label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onUpload}
              disabled={busy}
            />
            <span className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white">
              <ImagePlus className="h-4 w-4" />
              {busy ? t("Uploading...") : t("Upload")}
            </span>
          </label>
        </header>

        <div className="px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          {initial.length === 0 ? (
            <div className="rounded-xl bg-[#f7f8fa] px-5 py-8 text-center">
              <p className="text-sm font-semibold text-ink">
                {t("No photos yet — upload the first one.")}
              </p>
              <label className="mt-4 inline-flex cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onUpload}
                  disabled={busy}
                />
                <span className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white">
                  <ImagePlus className="h-4 w-4" />
                  {busy ? t("Uploading...") : t("Upload")}
                </span>
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {initial.map((img) => (
                <div
                  key={img.id}
                  className="overflow-hidden rounded-2xl border border-[#e8ebf0] bg-white"
                >
                  <div className="aspect-[4/3] bg-[#f2f4f7]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-ink">{img.title}</p>
                    <p className="mt-0.5 text-[11px] text-grey">
                      {formatDate(img.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
