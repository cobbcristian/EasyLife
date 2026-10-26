import type { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";
import { PresentationClient } from "./presentation-client";
import "../demo.css";

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
    absolute: "Barnaby | HOA executive presentation",
  },
  description: "Barnaby HOA executive presentation — view or download.",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      {
        url: "/brand/favicon-barnaby.svg?v=barnaby-tab-1",
        type: "image/svg+xml",
      },
      {
        url: "/brand/favicon-barnaby.png?v=barnaby-tab-1",
        type: "image/png",
      },
    ],
    apple: [{ url: "/brand/favicon-barnaby.png?v=barnaby-tab-1" }],
  },
};

/** Public shareable HOA deck — cookie lock cleared under /demo in proxy. */
export default function PresentationPage() {
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
      <PresentationClient />
    </div>
  );
}
