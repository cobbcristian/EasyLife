/**
 * Private lesson bookings create a MemberCharge for the fee.
 * Until that charge is paid, the lesson and amenity hold must stay pending
 * so unpaid API callers cannot lock courts/pros for free.
 */

export function initialLessonStatus(fee: number): "confirmed" | "pending" {
  return fee > 0 ? "pending" : "confirmed";
}
