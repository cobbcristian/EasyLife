import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { PlazaPitchClient } from "./plaza-pitch-client";
import "./plaza-pitch.css";

export const dynamic = "force-dynamic";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-pitch-display",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-pitch-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    absolute: "The Plaza at Oceanside | Easy Life",
  },
  description:
    "Boardroom sales pitch — how The Plaza at Oceanside runs on Easy Life, and how your community can too.",
  robots: { index: false, follow: false },
};

/** Public cinematic pitch — no login; cookie lock cleared in proxy like /go. */
export default function PlazaPitchPage() {
  return (
    <div
      className={`${fraunces.variable} ${outfit.variable}`}
      style={
        {
          ["--pitch-navy" as string]: "#071a2e",
          ["--pitch-atlantic" as string]: "#0d3558",
          ["--pitch-horizon" as string]: "#1a5a7a",
          ["--pitch-sand" as string]: "#c9b896",
          ["--pitch-foam" as string]: "#e7eef4",
          ["--pitch-ink" as string]: "#04101c",
        } as React.CSSProperties
      }
    >
      <PlazaPitchClient />
    </div>
  );
}
