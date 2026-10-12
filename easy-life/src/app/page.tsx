import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, SESSION_COOKIE, homeForRole } from "@/lib/server/auth";
import { LandingPage } from "./landing-page";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  
  if (session) {
    redirect(homeForRole(session.role, session.communityId));
  }

  return <LandingPage />;
}
