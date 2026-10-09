"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { readScreen, writeScreen } from "@/lib/screen-cache";
import { MemberMvpHome } from "@/components/member/member-mvp-home";
import { brandAssets, avatarForReviewer } from "@/lib/brand-assets";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";

interface HomeBooking {
  id: string;
  amenity: string;
  date: string;
  time: string;
  status: string;
}

interface HomeServiceBooking {
  id: string;
  service: string;
  date: string;
  time: string;
  status: string;
}

interface HomeEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  userRsvped?: boolean;
}

interface HomeTournament {
  id: string;
  title: string;
  sport: string;
  date: string;
  status: string;
  nextMatch: {
    opponent: string;
    courtNumber?: number | null;
    courtLabel?: string;
    time?: string;
    date?: string;
  } | null;
}

interface HomeData {
  balance: number;
  profile: {
    name: string;
    email?: string;
    residencyStatus?: string;
    paysHoa?: boolean;
    membershipTier?: string;
  };
  branding?: { id?: string; name: string; logoUrl: string | null } | null;
  featuredTiles?: Array<{
    key: string;
    label: string;
    sub: string;
    rating: string;
    price: string;
    image: string;
    href: string;
    sponsored?: boolean;
  }>;
  bookings: HomeBooking[];
  serviceBookings?: HomeServiceBooking[];
  events: HomeEvent[];
  requests: { id: string; status: string }[];
  ads: unknown[];
  tournaments: HomeTournament[];
  tournamentsEnabled?: boolean;
  notificationCount?: number;
}

function MemberMvpHomeSkeleton() {
  const { t } = useI18n();
  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <div className="bg-gradient-to-b from-[#ff7a00] via-[#f6c445] to-[#8ed63a] px-4 pb-14 pt-6 lg:rounded-t-2xl">
        <div className="mx-auto h-8 max-w-lg animate-pulse rounded bg-white/20" />
      </div>
      <div className="mx-auto -mt-6 max-w-lg px-4">
        <div className="h-12 animate-pulse rounded-[22px] bg-white shadow-md" />
      </div>
      <p className="py-10 text-center text-sm text-grey">{t("Loading…")}</p>
    </div>
  );
}

export function MemberHomeClient() {
  const session = useSessionProfile();
  const [data, setData] = useState<HomeData | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(brandAssets.memberAvatar);
  const [profileEmail, setProfileEmail] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return fetch("/api/member/home")
      .then(async (r) => {
        if (r.status === 401) {
          window.location.assign(
            `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
          );
          throw new Error("unauthorized");
        }
        if (!r.ok) throw new Error("home");
        return r.json();
      })
      .then((home) => {
        if (home?.error || !home?.profile) {
          setError("Could not load home.");
          return;
        }
        setError(null);
        setData(home);
        const email = typeof home.profile?.email === "string" ? home.profile.email : "";
        if (email) writeScreen(email, "member-home", home);
        const name = home.profile?.name;
        if (email) setProfileEmail(email);
        if (home.profile?.avatarUrl) {
          setAvatarSrc(home.profile.avatarUrl);
        } else if (name) {
          setAvatarSrc(avatarForReviewer(name));
        } else {
          setAvatarSrc(brandAssets.memberAvatar);
        }
      })
      .catch((err) => {
        if (err?.message === "unauthorized") return;
        setError("Could not load home.");
      })
      .finally(() => setLoading(false));
  }, []);

  useLayoutEffect(() => {
    if (!session.email) return;
    const saved = readScreen<HomeData>(session.email, "member-home");
    if (!saved?.profile) return;
    const cachedEmail = saved.profile.email?.toLowerCase();
    if (cachedEmail && cachedEmail !== session.email.toLowerCase()) return;
    setData(saved);
    setLoading(false);
    setProfileEmail(session.email);
  }, [session.email]);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !data) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm text-ink">{error}</p>
        <button
          type="button"
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
          onClick={() => {
            setError(null);
            setLoading(true);
            void load();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return <MemberMvpHomeSkeleton />;
  }

  return (
    <MemberMvpHome
      profileName={data.profile?.name ?? "Member"}
      profileEmail={profileEmail}
      avatarSrc={avatarSrc}
      clubName={data.branding?.name}
      clubLogoSrc={data.branding?.logoUrl}
      communityId={data.branding?.id}
      paysHoa={data.profile.paysHoa !== false}
      residencyStatus={data.profile.residencyStatus ?? "resident"}
      featuredTiles={data.featuredTiles}
      bookings={data.bookings}
      serviceBookings={data.serviceBookings ?? []}
      events={data.events}
      tournaments={data.tournaments ?? []}
      tournamentsEnabled={data.tournamentsEnabled ?? null}
      notificationCount={data.notificationCount ?? 0}
    />
  );
}
