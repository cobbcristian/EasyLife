"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

const VIEW = 280;
const OUTPUT = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type AvatarCropDialogProps = {
  file: File;
  onCancel: () => void;
  onCropped: (file: File) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function AvatarCropDialog({ file, onCancel, onCropped }: AvatarCropDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const coverScale = useMemo(() => {
    if (!natural.w || !natural.h) return 1;
    return Math.max(VIEW / natural.w, VIEW / natural.h);
  }, [natural.h, natural.w]);

  const displayScale = coverScale * zoom;

  const maxOffset = useMemo(() => {
    if (!natural.w || !natural.h) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (natural.w * displayScale - VIEW) / 2),
      y: Math.max(0, (natural.h * displayScale - VIEW) / 2),
    };
  }, [displayScale, natural.h, natural.w]);

  useEffect(() => {
    setOffset((prev) => ({
      x: clamp(prev.x, -maxOffset.x, maxOffset.x),
      y: clamp(prev.y, -maxOffset.y, maxOffset.y),
    }));
  }, [maxOffset.x, maxOffset.y]);

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: clamp(drag.ox + (e.clientX - drag.x), -maxOffset.x, maxOffset.x),
      y: clamp(drag.oy + (e.clientY - drag.y), -maxOffset.y, maxOffset.y),
    });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      dragRef.current = null;
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { dist, zoom };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    e.preventDefault();
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const next = pinchRef.current.zoom * (dist / pinchRef.current.dist);
    setZoom(clamp(next, MIN_ZOOM, MAX_ZOOM));
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
  }

  async function applyCrop() {
    const img = imgRef.current;
    if (!img || !natural.w) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      const ratio = OUTPUT / VIEW;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT, OUTPUT);
      ctx.setTransform(
        displayScale * ratio,
        0,
        0,
        displayScale * ratio,
        (VIEW / 2 + offset.x) * ratio,
        (VIEW / 2 + offset.y) * ratio,
      );
      ctx.drawImage(img, -natural.w / 2, -natural.h / 2);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Could not encode photo"))),
          "image/jpeg",
          0.92,
        );
      });

      const name = file.name.replace(/\.\w+$/, "") || "avatar";
      onCropped(new File([blob], `${name}.jpg`, { type: "image/jpeg" }));
    } catch {
      setBusy(false);
      toast({
        variant: "warning",
        title: t("Could not crop photo"),
        description: t("Try another image."),
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 font-[family-name:var(--font-poppins)] sm:items-center">
      <button
        type="button"
        className="absolute inset-0"
        aria-label={t("Close")}
        onClick={onCancel}
        disabled={busy}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-crop-title"
        className="relative w-full max-w-md rounded-t-[24px] bg-white px-4 pb-5 pt-3 shadow-xl sm:rounded-2xl"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#d1d1d6] sm:hidden" />
        <h2
          id="avatar-crop-title"
          className="text-center text-base font-semibold text-ink"
        >
          {t("Adjust photo")}
        </h2>
        <p className="mt-1 text-center text-[12px] text-grey">
          {t("Drag to move · pinch or use the slider to zoom")}
        </p>

        <div className="mt-4 flex justify-center">
          <div
            className="relative touch-none select-none overflow-hidden rounded-full bg-[#e8ebf0]"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={{
                  width: natural.w ? natural.w * displayScale : undefined,
                  height: natural.h ? natural.h * displayScale : undefined,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  setNatural({ w: el.naturalWidth, h: el.naturalHeight });
                }}
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-black/10" />
          </div>
        </div>

        <label className="mt-5 block px-1">
          <span className="text-[12px] font-medium text-grey">{t("Zoom")}</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--mvp-blue)]"
          />
        </label>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-11 flex-1 rounded-2xl border border-[#e4e8ee] text-sm font-semibold text-ink disabled:opacity-50"
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={applyCrop}
            disabled={busy || !natural.w}
            className="h-11 flex-1 rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? t("Saving…") : t("Use photo")}
          </button>
        </div>
      </div>
    </div>
  );
}
