"use client";

const FILE_PATH = "/demo/barnaby-hoa-executive-presentation.pptx";
const FILE_HREF = `${FILE_PATH}?v=1`;

function officeEmbedSrc(origin: string) {
  const fileUrl = `${origin}${FILE_PATH}?v=1`;
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

export function PresentationClient() {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const embedSrc = origin ? officeEmbedSrc(origin) : "";

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

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center px-5 py-10 sm:px-8 sm:py-14">
        <p
          className="demo-rise text-[clamp(2.75rem,10vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.03em] text-white"
          style={{ fontFamily: "var(--font-demo-display), system-ui, sans-serif" }}
        >
          Barnaby
        </p>
        <h1 className="demo-rise demo-rise-delay-1 mt-5 max-w-2xl text-[clamp(1.35rem,3.6vw,2.1rem)] font-medium leading-snug text-white/95">
          HOA executive presentation
        </h1>

        <div className="demo-rise demo-rise-delay-2 mt-7 flex flex-wrap items-center gap-3">
          <a
            href={FILE_HREF}
            download
            className="inline-flex items-center justify-center rounded-md bg-[var(--demo-amber)] px-6 py-3 text-sm font-semibold tracking-wide text-[#1a1408] transition hover:brightness-110"
          >
            Download PowerPoint
          </a>
          <a
            href="/demo"
            className="inline-flex items-center justify-center rounded-md border border-white/35 bg-white/5 px-6 py-3 text-sm font-semibold tracking-wide text-white backdrop-blur-sm transition hover:bg-white/12"
          >
            Watch video demo
          </a>
        </div>

        <div
          className="demo-rise demo-rise-delay-3 demo-video-shell mt-10 w-full overflow-hidden rounded-sm shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/15"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.25))",
          }}
        >
          <div className="relative aspect-[4/3] w-full bg-black/50 sm:aspect-video">
            {embedSrc ? (
              <iframe
                title="Barnaby HOA executive presentation"
                src={embedSrc}
                className="absolute inset-0 h-full w-full border-0"
                allowFullScreen
              />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
