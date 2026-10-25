"use client";

/** Hosted on our site — Google Drive embeds fail on phones (cookies / Google sign-in). */
const DEMO_VIDEO_SRC = "/demo/barnaby-demo.mp4";

export function DemoClient() {
  return (
    <div
      className="relative min-h-dvh overflow-x-hidden text-[var(--demo-foam)]"
      style={{
        fontFamily: "var(--font-demo-sans), system-ui, sans-serif",
        background:
          "linear-gradient(168deg, #062a2e 0%, #0a3d42 28%, #124a3a 58%, #1a3a28 100%)",
      }}
    >
      <div
        aria-hidden
        className="demo-glow pointer-events-none absolute -left-24 top-[-10%] h-[42vh] w-[55vw] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(232,168,56,0.35), transparent 68%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-[-8%] h-[48vh] w-[50vw] rounded-full blur-3xl opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(141,214,58,0.28), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center px-5 py-10 sm:px-8 sm:py-14">
        <p
          className="demo-rise text-[clamp(2.75rem,10vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.03em] text-white"
          style={{ fontFamily: "var(--font-demo-display), system-ui, sans-serif" }}
        >
          Barnaby
        </p>
        <h1 className="demo-rise demo-rise-delay-1 mt-5 max-w-2xl text-[clamp(1.35rem,3.6vw,2.1rem)] font-medium leading-snug text-white/95">
          The community app residents actually use.
        </h1>

        <div
          id="demo-video"
          className="demo-rise demo-rise-delay-2 demo-video-shell mt-10 w-full overflow-hidden rounded-sm shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/15"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.25))",
          }}
        >
          <div className="relative aspect-video w-full bg-black">
            <video
              className="absolute inset-0 h-full w-full"
              controls
              playsInline
              preload="metadata"
              controlsList="nodownload"
              title="Barnaby product demo"
            >
              <source src={DEMO_VIDEO_SRC} type="video/mp4" />
            </video>
          </div>
        </div>
      </main>
    </div>
  );
}
