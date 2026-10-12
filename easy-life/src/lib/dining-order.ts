import {
  estimateCookMinutes as estimateCookMinutesSmart,
  estimateCookMinutesFromOrder,
  type DiningLineInput,
} from "@/lib/dining-timing";

export type DiningFulfillment = "eat_in" | "takeout" | "delivery";
export type { DiningLineInput };
export { estimateCookMinutesFromOrder };

export function normalizeDiningFulfillment(
  value: string | null | undefined,
): DiningFulfillment {
  const v = (value ?? "").toLowerCase().trim();
  if (v === "eat_in" || v === "dine_in" || v === "eat-in" || v === "dine-in") {
    return "eat_in";
  }
  if (v === "delivery") return "delivery";
  return "takeout";
}

export function estimateCookMinutes(itemCount: number): number {
  return estimateCookMinutesSmart(itemCount);
}

/** Subtract minutes from HH:MM; clamps to same calendar day 00:00. */
export function subtractMinutesFromTime(time: string, minutes: number): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return time;
  let total = Number(m[1]) * 60 + Number(m[2]) - minutes;
  if (total < 0) total = 0;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Eat-in: food ready at arrival (kitchen starts earlier).
 * Takeout: food ready at pickup time.
 */
export function computeReadyBy(input: {
  fulfillment: DiningFulfillment;
  arriveTime: string;
  itemCount: number;
  items?: DiningLineInput[];
  partySize?: number | null;
  historicalAvgMinutes?: number | null;
}): { readyBy: string; kitchenStartBy: string; cookMinutes: number } {
  const cookMinutes = input.items?.length
    ? estimateCookMinutesFromOrder({
        items: input.items,
        partySize: input.partySize,
        historicalAvgMinutes: input.historicalAvgMinutes,
      })
    : estimateCookMinutes(input.itemCount);
  const readyBy =
    input.fulfillment === "delivery"
      ? subtractMinutesFromTime(input.arriveTime, Math.min(10, cookMinutes))
      : input.arriveTime;
  const kitchenStartBy = subtractMinutesFromTime(readyBy, cookMinutes);
  return { readyBy, kitchenStartBy, cookMinutes };
}

export function assignTableLabel(input: {
  existingCount: number;
  partySize: number;
}): string {
  const base = input.existingCount + 1;
  if (input.partySize >= 6) return `Table ${base} (large)`;
  return `Table ${base}`;
}

export function diningConfirmationMessage(input: {
  fulfillment: DiningFulfillment;
  restaurant: string;
  arriveDate: string;
  arriveTime: string;
  readyBy: string;
  tableLabel?: string | null;
  partySize?: number | null;
}): string {
  if (input.fulfillment === "eat_in") {
    return `Eat-in at ${input.restaurant}: ${input.tableLabel ?? "table held"} for ${input.partySize ?? 2} on ${input.arriveDate} at ${input.arriveTime}. Food timed to be ready at ${input.readyBy} — no wait for seating or the kitchen.`;
  }
  if (input.fulfillment === "takeout") {
    return `Takeout at ${input.restaurant}: pickup ${input.arriveDate} at ${input.arriveTime}. Food will be ready at ${input.readyBy}.`;
  }
  return `Delivery from ${input.restaurant} for ${input.arriveDate} around ${input.arriveTime}.`;
}
