"use client";

import { MemberInviteForm } from "@/components/invites/member-invite-form";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";

export default function AdminInvitesPage() {
  const profile = useSessionProfile();
  return <MemberInviteForm avatarName={profile.name} />;
}
