/**
 * When a member cancels an amenity booking that is a lesson court hold,
 * the LessonBooking and unpaid fee must cascade — otherwise the court is
 * freed (and rebookable) while the pro slot and due charge remain.
 */

export type LessonHoldCancelPlan = {
  cancelLesson: boolean;
  cancelDueCharge: boolean;
};

export function planLessonHoldCancel(input: {
  bookingKind: string | null | undefined;
  lessonBookingId: string | null | undefined;
  lessonStatus: string | null | undefined;
  chargeStatus: string | null | undefined;
}): LessonHoldCancelPlan {
  if (input.bookingKind !== "lesson_hold" || !input.lessonBookingId) {
    return { cancelLesson: false, cancelDueCharge: false };
  }
  if (!input.lessonStatus || input.lessonStatus === "cancelled") {
    return { cancelLesson: false, cancelDueCharge: false };
  }
  return {
    cancelLesson: true,
    cancelDueCharge: input.chargeStatus === "due",
  };
}
