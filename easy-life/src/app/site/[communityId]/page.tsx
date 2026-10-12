import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedWebsite } from "@/lib/server/website-builder";

export const dynamic = "force-dynamic";

export default async function PublicClubSitePage({
  params,
}: {
  params: Promise<{ communityId: string }>;
}) {
  const { communityId } = await params;
  const site = await getPublishedWebsite(communityId);
  if (!site.published || !site.community) notFound();

  const home = site.pages.find((p) => p.slug === "home") ?? site.pages[0];
  if (!home) notFound();

  const primary = site.community.primaryColor ?? "#1a3a52";

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)]">
      <header
        className="px-6 py-8 text-white"
        style={{ background: `linear-gradient(135deg, ${primary}, #0d1f2d)` }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Club website</p>
            <h1 className="text-3xl font-semibold">{site.community.name}</h1>
          </div>
          <Link
            href="/login"
            className="rounded-full bg-white/15 px-5 py-2 text-sm font-semibold backdrop-blur"
          >
            Member login
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        {home.blocks.map((block, i) => {
          if (block.type === "hero") {
            return (
              <section key={i} className="mb-12">
                <h2 className="text-3xl font-semibold text-ink">
                  {String(block.props.headline ?? "Welcome")}
                </h2>
                <p className="mt-3 text-lg text-grey">
                  {String(block.props.subhead ?? "")}
                </p>
                {block.props.ctaHref && (
                  <Link
                    href={String(block.props.ctaHref)}
                    className="mt-6 inline-flex rounded-xl px-6 py-3 text-sm font-semibold text-white"
                    style={{ backgroundColor: primary }}
                  >
                    {String(block.props.ctaLabel ?? "Learn more")}
                  </Link>
                )}
              </section>
            );
          }
          if (block.type === "amenities" || block.type === "events") {
            return (
              <section key={i} className="mb-10 rounded-2xl border border-[#e8ebf0] p-6">
                <h3 className="text-xl font-semibold capitalize">{block.type}</h3>
                <p className="mt-2 text-sm text-grey">
                  Managed in Easy Life — members book tee times, dining, and events from
                  the mobile app.
                </p>
              </section>
            );
          }
          return (
            <section key={i} className="mb-8 prose text-grey">
              <p>{block.type} block</p>
            </section>
          );
        })}
      </main>
    </div>
  );
}
