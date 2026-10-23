import type { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";
import { DemoClient } from "./demo-client";
import "./demo.css";

export const dynamic = "force-dynamic";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-demo-display",
  weight: ["600", "700", "800"],
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-demo-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    absolute: "Barnaby | Product demo",
  },
  description:
    "Watch the Barnaby demo, then open a live club and explore the app.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Barnaby | Product demo",
    description:
      "Watch the Barnaby demo, then open a live club and explore the app.",
    type: "website",
  },
};

/** Public shareable demo page — video + live club CTA. Cookie lock cleared in proxy. */
export default function DemoPage() {
  return (
    <div
      className={`${syne.variable} ${figtree.variable}`}
      style={
        {
          ["--demo-foam" as string]: "#eef6f2",
          ["--demo-amber" as string]: "#e8a838",
        } as React.CSSProperties
      }
    >
      <DemoClient />
    </div>
  );
}
