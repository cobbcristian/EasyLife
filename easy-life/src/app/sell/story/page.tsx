import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { StoryPitchClient } from "./story-pitch-client";
import "./story-pitch.css";

export const dynamic = "force-dynamic";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-story-display",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-story-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    absolute: "Easy Life | Product story",
  },
  description:
    "A story walkthrough of Easy Life — resident, provider, PM, and board in one continuous narrative.",
  robots: { index: false, follow: false },
};

/** Story-driven product walkthrough — public; cookie lock cleared in proxy. */
export default function StoryPitchPage() {
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
      <StoryPitchClient />
    </div>
  );
}
