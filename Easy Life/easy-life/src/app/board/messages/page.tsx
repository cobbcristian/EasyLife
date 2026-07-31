"use client";

import { PrivateMessageBoard } from "@/components/messages/private-message-board";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";

export default function BoardMessagesPage() {
  const { t } = useI18n();
  const profile = useSessionProfile();
  return (
    <PrivateMessageBoard
      channel="board"
      title={t("Private Message Board")}
      subtitle={t("Board Members Only")}
      avatarName={profile.name}
    />
  );
}
