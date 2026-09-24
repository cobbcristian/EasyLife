"use client";

import { MemberMvpHome } from "@/components/member/member-mvp-home";
import { useSearchParams } from "next/navigation";

export default function TestHomePage() {
  const searchParams = useSearchParams();
  const community = searchParams.get("community") ?? "spanish-wells";

  const communityConfig: Record<string, { communityId: string; clubName: string }> = {
    "oceanside-residents": {
      communityId: "oceanside-residents",
      clubName: "Oceanside Residents",
    },
    "spanish-wells": {
      communityId: "spanish-wells",
      clubName: "Spanish Wells Golf & Country Club",
    },
    "ironcrest": {
      communityId: "ironcrest",
      clubName: "IronCrest Club",
    },
  };

  const config = communityConfig[community] ?? communityConfig["spanish-wells"];

  return (
    <div className="min-h-screen bg-white">
      <div className="mb-4 flex gap-2 p-4 bg-gray-100 text-sm">
        <span className="font-medium">Test community:</span>
        <a href="?community=oceanside-residents" className={community === "oceanside-residents" ? "text-blue-600 font-bold" : "text-blue-600 underline"}>
          oceanside-residents (HOA)
        </a>
        <a href="?community=spanish-wells" className={community === "spanish-wells" ? "text-blue-600 font-bold" : "text-blue-600 underline"}>
          spanish-wells (Club)
        </a>
        <a href="?community=ironcrest" className={community === "ironcrest" ? "text-blue-600 font-bold" : "text-blue-600 underline"}>
          ironcrest (Club)
        </a>
      </div>
      <MemberMvpHome
        profileName="Jane Smith"
        profileEmail="jane@example.com"
        avatarSrc="/brand/member-avatar.png"
        clubName={config.clubName}
        communityId={config.communityId}
        paysHoa={true}
        residencyStatus="resident"
        featuredTiles={[]}
        bookings={[]}
        serviceBookings={[]}
        events={[]}
        tournaments={[]}
        notificationCount={2}
      />
    </div>
  );
}
