import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { EasyLifePitchClient } from "./easylife-pitch-client";
import "./easylife-pitch.css";

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
  title: {
    absolute: "Easy Life | Sales pitch",
  },
  description:
    "Boardroom pitch — Easy Life is the operating system for clubs and HOA communities.",
  robots: { index: false, follow: false },
};

/** Easy Life platform pitch — public; cookie lock cleared in proxy. */
export default function EasyLifePitchPage() {
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
        } as React.CSSProperties
      }
    >
      <EasyLifePitchClient />
    </div>
  );
}
