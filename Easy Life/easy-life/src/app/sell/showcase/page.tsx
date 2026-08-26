import Link from "next/link";
import { SalesDemoShowcase } from "@/components/sales/sales-demo-showcase";
import { SALES_CLUBS } from "@/lib/sales-clubs";

export default async function SellShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string }>;
}) {
  const { club: clubId } = await searchParams;
  const club = SALES_CLUBS.find((c) => c.id === clubId) ?? SALES_CLUBS[0];

  return (
    <div
      className="min-h-screen bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
      data-theme="harbor"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
        <div>
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] opacity-65">
            Easy Life · Sales preview
          </p>
          <h1 className="font-harbor-display m-0 mt-1.5 text-2xl font-semibold">
            {club.name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {SALES_CLUBS.map((c) => (
            <Link
              key={c.id}
              href={`/sell/showcase?club=${c.id}`}
              className="rounded-full border border-white/20 px-3.5 py-2 text-xs font-semibold transition-colors"
              style={{
                background: c.id === club.id ? "var(--harbor-sand)" : "rgba(246,241,232,0.1)",
                color: c.id === club.id ? "var(--harbor-ink)" : "var(--harbor-sand)",
              }}
            >
              {c.id === "oceanside"
                ? "Oceanside"
                : c.id === "ironcrest"
                  ? "IronCrest"
                  : "Golden Ocala"}
            </Link>
          ))}
        </div>
      </header>

      <SalesDemoShowcase club={club} />

      <p className="mx-auto max-w-lg px-5 pb-8 pt-6 text-center text-xs leading-relaxed opacity-55">
        Live clickable demos:{" "}
        <Link href="/go/oceanside" className="underline opacity-90">
          /go/oceanside
        </Link>
        ,{" "}
        <Link href="/go/ironcrest" className="underline opacity-90">
          /go/ironcrest
        </Link>
        ,{" "}
        <Link href="/go/goldenocala" className="underline opacity-90">
          /go/goldenocala
        </Link>{" "}
        — password <strong>password</strong>
      </p>
    </div>
  );
}
