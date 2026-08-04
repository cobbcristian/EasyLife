"use client";

import { useRef, useState } from "react";
import { AvatarCropDialog } from "@/components/account/avatar-crop-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

export function ChangePhotoButton({
  label,
  onPhotoChange,
  variant = "outline",
  size = "sm",
  className,
  children,
}: {
  label?: string;
  onPhotoChange: (avatarUrl: string) => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "warning",
        title: t("Could not upload photo"),
        description: t("Please choose an image file."),
      });
      return;
    }
    setCropFile(file);
  }

  async function uploadCropped(file: File) {
    setCropFile(null);
    setBusy(true);
    const form = new FormData();
    form.append("photo", file);
    const res = await fetch("/api/account/avatar", { method: "POST", body: form });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({
        variant: "warning",
        title: t("Could not upload photo"),
        description: typeof data.error === "string" ? data.error : "",
      });
      return;
    }

    const data = await res.json();
    onPhotoChange(data.avatarUrl);
    toast({ variant: "success", title: t("Photo updated") });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {children ?? (busy ? t("Uploading…") : (label ?? t("Change photo")))}
      </Button>
      {cropFile ? (
        <AvatarCropDialog
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onCropped={uploadCropped}
        />
      ) : null}
    </>
  );
}
