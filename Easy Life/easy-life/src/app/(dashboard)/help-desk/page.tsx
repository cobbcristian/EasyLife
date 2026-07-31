"use client";

import { AdminMvpMessages } from "@/components/messages/admin-mvp-messages";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";

/** Figma Community Admin Messages / Help Desk (5539:5368). */
export default function HelpDeskPage() {
  const profile = useSessionProfile();
  return <AdminMvpMessages avatarName={profile.name} />;
}
