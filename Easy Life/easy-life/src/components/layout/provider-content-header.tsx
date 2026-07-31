"use client";

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

  return (
    <ContentHeader
      title={title}
      backHref={backHref}
      right="avatar"
      avatarName={name}
      avatarSrc={avatarSrc}
      translateTitle={translateTitle}
      tasksHref="/provider/bookings"
      tasksLabel={`3 ${t("Tasks")}`}
      messagesHref={showMessages ? "/provider/messages" : undefined}
    />
  );
}
