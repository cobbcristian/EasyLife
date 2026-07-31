"use client";

import { PrivateMessageBoard } from "@/components/messages/private-message-board";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";

export default function PmMessagesPage() {
  const { t } = useI18n();
  const profile = useSessionProfile();
  return (
    <PrivateMessageBoard
      channel="pm"
      title={t("Board Communications")}
      subtitle={t("Private channel with Board Members")}
      avatarName={profile.name}
    />
  );
}
