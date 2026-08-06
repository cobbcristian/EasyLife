"use client";

import { useEffect, useState } from "react";
import { ContentHeader } from "@/components/layout/content-header";
import { defaultAvatarForRole } from "@/lib/brand-assets";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { useI18n } from "@/lib/i18n";

export function ProviderContentHeader({
  title,
  backHref,
  avatarName,
  translateTitle = true,
  showMessages = false,
}: {
  title: string;
  backHref?: string;
  avatarName?: string;
  translateTitle?: boolean;
  /** Figma Admin Booking Management (5687:5540) — chat bubble beside avatar. */
  showMessages?: boolean;
}) {
  const { t } = useI18n();
  const session = useSessionProfile();
  const [openTasks, setOpenTasks] = useState(0);
  // Display name may come from the page, but the photo must always follow the
  // signed-in session — otherwise tabs that pass "" / business name / person
  // name flip between living-room and lawn thumbnails.
  const name =
    (avatarName && avatarName.trim()) ||
    (session.name && session.name !== "Member" ? session.name : "") ||
    "Provider";
  const avatarSrc = defaultAvatarForRole(
    session.role || "provider",
    session.avatarUrl,
    session.name,
    session.email,
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/provider/bookings").then((r) => r.json()),
      fetch("/api/provider/messages").then((r) => r.json()),
    ])
      .then(([bookingData, messageData]) => {
        if (cancelled) return;
        const pending = (
          (bookingData.bookings ?? []) as Array<{ status: string }>
        ).filter((b) => b.status === "pending" || b.status === "upcoming").length;
        const unread = (
          (messageData.threads ?? []) as Array<{ unread: boolean }>
        ).filter((thread) => thread.unread).length;
        setOpenTasks(pending + unread);
      })
      .catch(() => {
        if (!cancelled) setOpenTasks(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ContentHeader
      title={title}
      backHref={backHref}
      right="avatar"
      avatarName={name}
      avatarSrc={avatarSrc}
      translateTitle={translateTitle}
      tasksHref="/provider/bookings"
      tasksLabel={`${openTasks} ${t("Tasks")}`}
      messagesHref={showMessages ? "/provider/messages" : undefined}
    />
  );
}
