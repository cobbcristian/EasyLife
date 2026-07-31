import { z } from "zod";

export const bookingSchema = z
  .object({
    amenity: z.string().min(1).optional(),
    amenityId: z.string().min(1).optional(),
    date: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    /** Preferred court / tee time / lane number when facility has multiple units. */
    unitNumber: z.number().int().positive().nullable().optional(),
    /// Max invitees who can accept (first N). Omit/null = unlimited.
    inviteCapacity: z.number().int().positive().nullable().optional(),
    /** Court add-ons: balls | towels | drinks | lights */
    addons: z.array(z.string().min(1)).max(20).optional(),
    invites: z
      .array(
        z.object({
          email: z.string().email(),
          name: z.string().min(1),
        }),
      )
      .optional(),
  })
  .refine((d) => d.endTime > d.startTime, { message: "End must be after start" })
  .refine((d) => Boolean(d.amenity || d.amenityId), { message: "Amenity required" });

export const serviceRequestSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  unit: z.string().optional(),
});

const tiebreakerCriterionSchema = z.enum([
  "head_to_head",
  "set_percentage",
  "game_percentage",
]);

export const tournamentSchema = z.object({
  title: z.string().min(1),
  sport: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().optional(),
  entryFee: z.number().min(0).max(10000).optional(),
  participants: z.number().int().min(2).max(64).optional(),
  scoringFormat: z.enum(["Standard", "Fast4", "Best of 3"]).optional(),
  eventType: z.enum(["Singles", "Doubles", "Mixed"]).optional(),
  courtSurface: z
    .enum(["hard_court", "green_clay", "red_clay", "grass", "carpet"])
    .optional(),
  tiebreakers: z.array(tiebreakerCriterionSchema).min(1).max(3).optional(),
  noStartDefault: z.enum(["manual", "higher_seed", "lower_seed"]).optional(),
});

export const tournamentPlayerSchema = z.object({
  name: z.string().min(1),
  memberEmail: z.string().email().optional(),
  ustaRating: z.string().optional(),
  utrRating: z.number().min(0).max(16.5).optional(),
  handicap: z.number().min(-10).max(54).optional(),
  partnerName: z.string().optional(),
  partnerEmail: z.string().email().optional(),
  paid: z.boolean().optional(),
});

export const apparelOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        name: z.string().min(1),
        size: z.string().min(1),
        qty: z.number().int().min(1).max(500),
        unitPrice: z.number().min(0),
      }),
    )
    .min(1),
  notes: z.string().optional(),
  orderType: z.enum(["club", "member"]).optional(),
});

export const templateSchema = z.object({
  name: z.string().min(1),
  channel: z.enum(["email", "sms", "push"]),
  subject: z.string().min(1),
});

export const checkinSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["guest", "vendor"]),
  host: z.string().min(1),
  unit: z.string().optional(),
  photoUrl: z.string().optional(),
});

export const promotionSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["coupon", "ppc", "featured"]),
  detail: z.string().min(1),
  status: z.enum(["active", "scheduled", "ended"]).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  href: z.string().optional(),
  subtitle: z.string().optional(),
  rating: z.string().optional(),
  priceLabel: z.string().optional(),
});

export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join("; ") || "Invalid request";
    return { ok: false, error: msg };
  }
  return { ok: true, data: result.data };
}
