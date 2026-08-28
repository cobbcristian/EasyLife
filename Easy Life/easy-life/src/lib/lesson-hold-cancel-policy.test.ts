import { describe, expect, it } from "vitest";
import { planLessonHoldCancel } from "@/lib/lesson-hold-cancel-policy";

describe("planLessonHoldCancel", () => {
  it("cascades lesson + due charge when cancelling a lesson_hold", () => {
    expect(
      planLessonHoldCancel({
        bookingKind: "lesson_hold",
        lessonBookingId: "lb1",
        lessonStatus: "confirmed",
        chargeStatus: "due",
      }),
    ).toEqual({ cancelLesson: true, cancelDueCharge: true });
  });

  it("cancels the lesson but leaves a paid charge alone", () => {
    expect(
      planLessonHoldCancel({
        bookingKind: "lesson_hold",
        lessonBookingId: "lb1",
        lessonStatus: "pending",
        chargeStatus: "paid",
      }),
    ).toEqual({ cancelLesson: true, cancelDueCharge: false });
  });

  it("ignores ordinary amenity bookings", () => {
    expect(
      planLessonHoldCancel({
        bookingKind: "amenity",
        lessonBookingId: null,
        lessonStatus: null,
        chargeStatus: null,
      }),
    ).toEqual({ cancelLesson: false, cancelDueCharge: false });
  });

  it("is a no-op when the lesson is already cancelled", () => {
    expect(
      planLessonHoldCancel({
        bookingKind: "lesson_hold",
        lessonBookingId: "lb1",
        lessonStatus: "cancelled",
        chargeStatus: "due",
      }),
    ).toEqual({ cancelLesson: false, cancelDueCharge: false });
  });
});
