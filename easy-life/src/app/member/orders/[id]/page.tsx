import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, X } from "lucide-react";
import { brandAssets } from "@/lib/brand-assets";
import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, getOrderForMember } from "@/lib/server/records";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function fulfillmentLabel(f: string): string {
  const v = f.toLowerCase();
  if (v === "eat_in" || v === "dine_in") return "Eat-in";
  if (v === "delivery") return "Delivery";
  if (v === "pickup" || v === "takeout") return "Takeout";
  return f;
}

export default async function MemberOrderReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  await ensureRecordsSeeded();
  const { id } = await params;
  const order = await getOrderForMember(id, session.email);
  if (!order) notFound();

  let lines: Array<{ name: string; qty: number }> = [];
  try {
    const parsed = JSON.parse(order.items) as Array<{ name: string; qty: number }>;
    if (Array.isArray(parsed)) lines = parsed;
  } catch {
    lines = [{ name: order.items, qty: 1 }];
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-lg bg-white pb-28 font-[family-name:var(--font-poppins)]">
      <div className="flex items-center gap-3 bg-[var(--mvp-blue)] px-4 py-3 text-[13px] font-medium leading-snug text-white">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/80">
          <Check className="h-4 w-4" />
        </span>
        Order confirmed — receipt saved to Dining.
      </div>

      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brandAssets.featuredDining}
          alt=""
          className="h-[200px] w-full object-cover"
        />
        <Link
          href="/member/dining"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-[var(--mvp-blue)]" strokeWidth={2.25} />
        </Link>
      </div>

      <div className="px-4 pt-5">
        <p className="text-[13px] font-medium text-[#f99f25]">Receipt</p>
        <h1 className="mt-1 text-[22px] font-semibold text-ink">
          {order.restaurant?.trim() || "Club dining"}
        </h1>
        <p className="mt-1 text-sm text-grey">
          {fulfillmentLabel(order.fulfillment)}
          {order.tableLabel ? ` · ${order.tableLabel}` : ""}
          {order.arriveDate
            ? ` · ${order.arriveDate}${order.arriveTime ? ` ${order.arriveTime}` : ""}`
            : ""}
        </p>
        <p className="mt-1 text-[12px] capitalize text-[var(--mvp-blue)]">
          {order.status}
          {order.readyBy ? ` · Ready by ${order.readyBy}` : ""}
        </p>

        <ul className="mt-6 divide-y divide-[#ececec]">
          {lines.map((line, idx) => (
            <li
              key={`${line.name}-${idx}`}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <span className="text-ink">
                {line.qty}× {line.name}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-[#ececec] pt-4">
          <span className="text-[15px] font-semibold text-ink">Total</span>
          <span className="text-[15px] font-semibold text-ink">
            {formatCurrency(order.total)}
          </span>
        </div>
        <p className="mt-2 text-[12px] text-grey">
          Placed {formatDate(order.createdAt.toISOString())}
        </p>

        <Link
          href="/member/dining"
          className="mt-8 flex h-12 items-center justify-center rounded-xl bg-[var(--mvp-blue)] text-[15px] font-semibold text-white"
        >
          Back to dining
        </Link>
      </div>
    </div>
  );
}
