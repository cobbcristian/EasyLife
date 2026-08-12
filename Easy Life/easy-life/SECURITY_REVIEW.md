# Security Review — Easy Life API Routes

**Date:** 2026-08-12
**Scope:** API routes for bookings, events, checkout, escrow, HOA, memberships, and supporting server libraries.

---

## CRITICAL Findings

### 1. CRITICAL — Event RSVP Payment Bypass via `paid` Flag (RSVP route)

**File:** `src/app/api/events/[id]/rsvp/route.ts` (lines 23–28, 109)

**Description:** The `paid` boolean is read directly from the client request body and used as the gate for whether to enforce payment:

```typescript
paid = Boolean(body?.paid);
// ...
if (feeCents > 0 && !paid) {
  // return "needsPayment" prompt
}
// Otherwise, RSVP is created for free
```

**Attack:** Any authenticated user can RSVP to a paid event/clinic for free by sending `{ "paid": true }` in the POST body. No server-side verification confirms that a Stripe charge actually succeeded.

**Impact:** Complete financial bypass — all paid events and clinics can be attended at zero cost.

**Mitigation found:** None. The `paid` flag is entirely client-controlled.

---

### 2. CRITICAL — Checkout Route Marks Charges Paid Without Payment Verification (Demo Mode in Non-Production)

**File:** `src/app/api/checkout/route.ts` (lines 98–110)

**Description:** When Stripe is not configured, `isDemoPaymentAllowed()` returns `true` in non-production environments by default (the flag defaults to `!isProductionRuntime()`). In that case, the `afterChargePaid()` function runs unconditionally — marking the charge as paid, activating shared calendars, and transitioning escrow jobs to "held" — without any actual payment:

```typescript
if (!stripe) {
  if (isDemoPaymentAllowed()) {
    if (body.chargeId) {
      await afterChargePaid(body.chargeId);
    }
    return NextResponse.json({ ok: true, paid: true, mode: "demo", ... });
  }
}
```

**Attack:** In any staging/preview deployment without `STRIPE_SECRET_KEY` set (common for Vercel previews), any authenticated user can mark arbitrary charges as paid by supplying any `chargeId`. This transitions escrow to "held" and activates shared calendars.

**Impact:** Financial bypass on all non-production deployments. If `ALLOW_DEMO_PAYMENTS` is inadvertently left on in production or Stripe key is missing, this becomes a production vulnerability.

**Mitigation found:** Demo payments are gated on `isDemoPaymentAllowed()`, but the default is permissive for non-production.

---

### 3. CRITICAL — Privilege Escalation via Community Switch (Role Preserved Across Communities)

**File:** `src/app/api/memberships/switch/route.ts` (lines 37–43)

**Description:** When switching communities, the new session token preserves `session.role` from the old community instead of using the role from the target community's membership record:

```typescript
const token = await createSessionToken({
  sub: session.sub,
  email: session.email,
  role: session.role,           // BUG: uses role from PREVIOUS community
  name: session.name,
  communityId: body.communityId.trim(),
});
```

`switchActiveCommunity()` returns `result.role` but it is never used.

**Attack:** A user who is `admin` in community A can switch to community B (where they are `member`) and retain `admin` privileges. This allows full admin access to the target community — managing bookings, maintenance tasks, bids, guest fees, membership policies, and viewing other members' data.

**Impact:** Complete privilege escalation across communities in a multi-tenant system.

**Mitigation found:** `switchActiveCommunity()` correctly verifies membership exists, but the returned role is discarded.

---

### 4. CRITICAL — HOA Checkout Marks Charge Paid in Demo Mode Without Payment

**File:** `src/app/api/member/hoa-checkout/route.ts` (lines 42–52)

**Description:** Same demo-mode pattern as the general checkout, but for HOA dues specifically. HOA amounts are computed server-side (good), but when Stripe is unconfigured and demo mode is on, `markHoaChargePaid(payment.chargeId)` runs immediately:

```typescript
if (isDemoPaymentAllowed()) {
  await markHoaChargePaid(payment.chargeId);
  return NextResponse.json({ ok: true, paid: true, mode: "demo", ... });
}
```

This also clears the `currentBalance` on the unit's HOA fee record, meaning the user appears fully paid.

**Impact:** HOA assessments can be "paid" for free on any non-production deployment.

---

## HIGH Findings

### 5. HIGH — Cross-Tenant Event Cancellation (Missing Community Check)

**File:** `src/app/api/events/[id]/cancel/route.ts` (lines 10–15) and `src/lib/server/records.ts` (lines 501–516)

**Description:** Event cancellation checks only `session.name` matches `event.createdBy`. There is no `communityId` check. The authorization uses name-based matching (case-insensitive string comparison on display names), not email-based:

```typescript
if (event.createdBy.trim().toLowerCase() !== memberName.trim().toLowerCase()) {
  return null;
}
```

**Attack:** If two users in different communities share the same display name (e.g., "John Smith"), user A can cancel events created by user B in another community. No role check is enforced either — any authenticated user can cancel events, not just the organizer.

**Impact:** Cross-tenant event deletion. Name collisions are common enough to be exploitable. Additionally, display names are typically user-chosen and could be changed to match a target.

---

### 6. HIGH — Cross-Tenant Event Invite Authorization Uses Display Name, Not Email

**File:** `src/app/api/events/[id]/invites/route.ts` (lines 39–46)

**Description:** The "only the organizer can invite" check compares `session.name` against `event.createdBy` (both display names):

```typescript
if (event.createdBy.trim().toLowerCase() !== session.name.trim().toLowerCase()) {
  return NextResponse.json({ error: "Only the organizer can invite" }, { status: 403 });
}
```

**Attack:** Any user who sets their display name to match an event organizer's name can send invites for that event, including events in other communities (no `communityId` check on the event lookup).

---

### 7. HIGH — Booking Invite Route Missing Community Check (IDOR)

**File:** `src/app/api/bookings/[id]/invites/route.ts` (lines 35–41)

**Description:** The route fetches the booking by ID only and checks that the session user is the booking host. However, it does not verify that the booking belongs to the same community as the authenticated user:

```typescript
const booking = await prisma.booking.findUnique({ where: { id } });
```

**Attack:** A member in community A who somehow obtains a booking ID from community B can verify if they are the host of that booking. While exploitation requires the attacker to also be the host, the lack of community scoping leaks information about booking existence across tenants.

**Mitigation found:** The email check prevents unauthorized invites but doesn't prevent cross-tenant information leakage.

---

### 8. HIGH — Event RSVP Route Missing Community Check (Cross-Tenant RSVP)

**File:** `src/app/api/events/[id]/rsvp/route.ts` (lines 35, 139–145)

**Description:** The RSVP route looks up the event by ID without any community check:

```typescript
const event = await prisma.communityEvent.findUnique({ where: { id } });
```

A user from community A can RSVP to events in community B if they know the event ID.

**Attack:** Enumerate or guess event IDs (CUIDs are not truly unguessable in some Prisma configurations) to RSVP to events in other communities. For free events, the RSVP goes through immediately.

**Impact:** Cross-tenant data manipulation. Users can join events they should not have access to.

---

### 9. HIGH — Race Condition in Event RSVP Capacity Check

**File:** `src/app/api/events/[id]/rsvp/route.ts` (lines 90–97, 139–145)

**Description:** The capacity check (`assertEventHasCapacity(id)`) and the RSVP creation (`prisma.eventRsvp.create(...)`) are not wrapped in a transaction:

```typescript
await assertEventHasCapacity(id);  // Step 1: check capacity
// ... (gap where another request could also pass capacity check)
await prisma.eventRsvp.create({ ... }); // Step 2: create RSVP
```

**Attack:** Two concurrent requests can both pass the capacity check when only one slot remains, resulting in overbooking.

**Impact:** Event capacity limits can be exceeded.

---

### 10. HIGH — Escrow Release / Dispute Without Work Completion Verification

**File:** `src/app/api/local-pros/escrow/route.ts` (lines 35–56), `src/lib/server/local-pros.ts` (lines 782–816)

**Description:** Escrow release only checks that the job is "held" and the requesting user is the member who created it. There is no verification that work was actually completed, no provider confirmation, no timelock, and no admin approval:

```typescript
if (job.status !== "held") {
  return { error: "Only held payments can be released." };
}
const updated = await prisma.escrowJob.update({
  where: { id: job.id },
  data: { status: "released", releasedAt: new Date() },
});
```

**Attack:** A member can collude with a provider to create an escrow job, pay for it (transitioning to "held"), and immediately release funds — essentially laundering money through the platform. Alternatively, a member can release funds before the provider has actually done any work.

**Impact:** Financial loss — escrow provides no actual protection without work verification.

---

## MEDIUM Findings

### 11. MEDIUM — Checkout Route Accepts Arbitrary Client-Supplied Amount

**File:** `src/app/api/checkout/route.ts` (lines 28–45)

**Description:** The general checkout route accepts `amount` and `description` directly from the client body:

```typescript
const amount = Number(body.amount);
```

While the Stripe session is created server-side with this amount (so users can't alter the Stripe payment page), the amount itself comes from the client. If `chargeId` is provided, the `afterChargePaid()` function is called after Stripe succeeds — but there's no verification that the amount paid matches the charge's expected amount.

**Attack:** A user could create a Stripe checkout session for $0.01, complete payment, and the charge would be marked as "paid" regardless of the original charge amount.

**Mitigation found:** For HOA checkout (`hoa-checkout/route.ts`), the amount is correctly computed server-side. The general checkout route does not have this protection.

---

### 12. MEDIUM — Checkout Success URL Allows Client-Side Charge Marking

**File:** `src/app/api/checkout/route.ts` (lines 131–135)

**Description:** The `success_url` includes the `chargeId` as a query parameter:

```typescript
success_url: `${origin}${returnPath}?payment=success${body.chargeId ? `&chargeId=${body.chargeId}` : ""}`,
```

If the frontend reads `chargeId` from the URL and calls `afterChargePaid` on the client side (or if there's any client-side handler that marks it paid), this would be exploitable. However, the webhook handler exists to handle this server-side.

**Mitigation found:** The Stripe webhook handler (`stripe/webhook/route.ts`) properly validates signatures and handles the `checkout.session.completed` event. This is the correct flow. The success URL `chargeId` parameter is informational for the UI redirect.

---

### 13. MEDIUM — Event Creation Allows Any Member to Create Promoted/Paid Events

**File:** `src/app/api/events/route.ts` (lines 43–47, 58–60)

**Description:** The POST handler allows `admin`, `board`, `pm`, and `member` roles to create events. Members can set `isPromoted: true` and `requirePayment: true` with arbitrary `feeCents`:

```typescript
if (!session || !["admin", "board", "pm", "member"].includes(session.role)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Attack:** A regular member can create promoted paid events, potentially as a social engineering vector (fake paid events that collect money through the platform).

---

### 14. MEDIUM — Guest Fee Amount Can Be Overridden by Admin/PM

**File:** `src/app/api/guest-fees/route.ts` (lines 98–104)

**Description:** While the preset amount is the default, the `body.amount` field allows overriding:

```typescript
const amount =
  typeof body.amount === "number" && body.amount > 0
    ? body.amount
    : preset.amount;
```

**Mitigation found:** Only `pm`, `admin`, and `board` roles can access this endpoint, so this is intentional flexibility for management.

---

### 15. MEDIUM — Refund Request Resolution Has No Authorization

**File:** `src/lib/server/refunds.ts` (lines 155–171)

**Description:** `resolveRefundRequest()` accepts any `id` and `status` without checking who is resolving it or whether they have authority:

```typescript
export async function resolveRefundRequest(input: {
  id: string;
  status: Exclude<RefundStatus, "pending">;
}): Promise<RefundRequestRow | null> {
  const row = await prisma.refundRequest.update({
    where: { id: input.id },
    data: { status: input.status, resolvedAt: new Date() },
  });
```

If any API route exposes this without proper role checks, any user could approve/deny refunds.

**Note:** This is a library function — the risk depends on which API route calls it and whether that route has proper authorization.

---

### 16. MEDIUM — Commission Line Marking Has No Authorization Guard

**File:** `src/lib/server/commissions.ts` (lines 264–272)

**Description:** `markCommissionLinesPaid()` accepts arbitrary line IDs and marks them as "paid" without verifying who is calling:

```typescript
export async function markCommissionLinesPaid(lineIds: string[]): Promise<number> {
  const result = await prisma.commissionLine.updateMany({
    where: { id: { in: lineIds }, status: { in: ["pending", "payable"] } },
    data: { status: "paid" },
  });
```

**Note:** Same as above — this is a library function. Risk depends on the API route that calls it.

---

## LOW Findings

### 17. LOW — Booking Detail Route Lacks Community Scoping

**File:** `src/app/api/bookings/[id]/route.ts` (lines 13–14)

**Description:** `getBookingReservationDetail(id, session.email)` checks that the user is the host or an invitee, but doesn't check `communityId`. A user can view booking details for bookings in other communities if they happen to be the host or an invitee.

**Mitigation found:** The email check limits exposure — you can only view bookings you're involved in.

---

### 18. LOW — Event Detail Route Lacks Community Scoping

**File:** `src/app/api/events/[id]/route.ts` (lines 13–18)

**Description:** Similar to bookings — the event detail is fetched by ID without community check. `getEventReservationDetail` likely returns the event regardless of community.

---

### 19. LOW — Provider Reviews Not Scoped to Community

**File:** `src/app/api/local-pros/[id]/reviews/route.ts`

**Description:** Reviews are listed and created by `providerId` without checking that the provider belongs to the user's community:

```typescript
const reviews = await listProviderReviews(id);
```

A user from community A could review a provider in community B.

**Mitigation found:** `upsertProviderReview` does verify the provider exists and is a "local_pro", but doesn't check community ownership.

---

### 20. LOW — Hardcoded Dev Secret for JWT

**File:** `src/lib/server/auth.ts` (lines 14–18)

**Description:** In non-production, a hardcoded secret is used for JWT signing:

```typescript
return new TextEncoder().encode(
  "easy-life-dev-secret-change-in-production",
);
```

**Mitigation found:** Production requires `AUTH_SECRET` to be set, and an error is thrown if missing.

---

## Mitigations Observed

| Area | Mitigation |
|------|-----------|
| Booking creation | Uses `session.communityId` for scoping; validates schema with Zod |
| Booking cancellation | Checks `booking.memberEmail === session.email` |
| Booking invites | Checks host email match (but no community check on the booking) |
| HOA checkout amount | Always computed server-side from `UnitHoaFee`, never from client |
| Stripe webhook | Properly validates `stripe-signature` header |
| Escrow creation | Validates provider exists and has escrow enabled |
| Escrow release/dispute | Validates `job.memberEmail === session.email` |
| Membership switch | Validates user has active membership in target community |
| Bids / Maintenance | Properly restricted to admin/board/pm roles |
| Guest fees | Properly restricted to pm/admin/board roles |
| Session JWT | Production requires `AUTH_SECRET`; tokens expire in 7 days |
| Booking invite acceptance | Uses transaction for capacity check + acceptance |

---

## Recommended Fixes (Priority Order)

1. **CRITICAL — RSVP payment bypass:** Remove the client-supplied `paid` flag. Instead, verify payment completion server-side (check charge status in database or require a valid Stripe session ID).

2. **CRITICAL — Community switch role escalation:** Use `result.role` from `switchActiveCommunity()` instead of `session.role` when creating the new session token:
   ```typescript
   role: result.role,  // instead of session.role
   ```

3. **CRITICAL — Demo payment controls:** Add an explicit `ALLOW_DEMO_PAYMENTS=0` default for staging/preview deployments, or require an explicit opt-in even in non-production.

4. **HIGH — Cross-tenant event operations:** Add `communityId` checks to event cancel, event invites, and event RSVP routes. Use email-based authorization instead of display-name matching for event ownership.

5. **HIGH — RSVP race condition:** Wrap the capacity check and RSVP creation in a Prisma `$transaction` block.

6. **HIGH — Escrow verification:** Add work-completion verification (e.g., provider confirmation, timelock, or admin approval) before allowing escrow release.

7. **MEDIUM — Checkout amount verification:** For the general checkout route, verify that the Stripe payment amount matches the expected charge amount before marking it paid, or compute the amount server-side from the charge record.
