import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { TourPitchClient } from "./tour-pitch-client";
import "../easylife-pitch.css";

export const dynamic = "force-dynamic";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-el-display",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-el-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { absolute: "Easy Life | Product tour" },
  description:
    "Screenshot walkthrough of Easy Life — resident, provider, PM, and board with real product UI.",
  robots: { index: false, follow: false },
};

export default function TourPitchPage() {
  return (
    <div
      className={`${fraunces.variable} ${outfit.variable}`}
      style={
        {
          ["--el-void" as string]: "#07090c",
          ["--el-slate" as string]: "#12161c",
          ["--el-steel" as string]: "#1c2430",
          ["--el-signal" as string]: "#0a84ff",
          ["--el-signal-soft" as string]: "#3f9bff",
          ["--el-mist" as string]: "#e8eef5",
          ["--el-mute" as string]: "rgba(232,238,245,0.62)",
          ["--el-ember" as string]: "#7dd3c0",
        } as React.CSSProperties
      }
    >
      <TourPitchClient />
    </div>
  );
}
