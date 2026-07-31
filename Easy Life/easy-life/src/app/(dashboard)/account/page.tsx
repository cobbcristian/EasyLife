import { getSession } from "@/lib/server/auth";
import { isClubAdmin } from "@/lib/server/community-context";
import { getAccountProfile } from "@/lib/server/db";
import { superAdmin } from "@/lib/communities-data";
import { CommunityAdminAccounts } from "@/components/admin/community-admin-accounts";

export default async function AccountPage() {
  const session = await getSession();
  const profile = session ? await getAccountProfile(session.email) : null;
  const account = {
    name: profile?.name ?? session?.name ?? superAdmin.name,
    email: profile?.email ?? session?.email ?? superAdmin.email,
    avatarUrl: profile?.avatarUrl ?? null,
  };

  if (session && isClubAdmin(session)) {
    return <CommunityAdminAccounts currentUser={account} />;
  }

  /** Figma Admin Accounts (5464:9289) — super admin Administration view. */
  return (
    <CommunityAdminAccounts
      currentUser={account}
      headerTitle="Administration"
      headerRight="logo"
      eyebrow="Super Admin"
      description="Administrators who can manage every community."
    />
  );
}
