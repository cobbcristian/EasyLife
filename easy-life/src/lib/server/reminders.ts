import { sendEmail } from "@/lib/server/notify";
import { sendPushToUser } from "@/lib/server/push";
import { memberPhone, sendSms } from "@/lib/server/sms";

export type ReminderChannel = "email" | "sms" | "push";

export interface ScheduledReminderRow {
  communityId: string;
  userEmail: string;
  userName: string;
  channel: ReminderChannel;
  subject: string;
  body: string;
  sendAt: Date;
  referenceType: string;
  referenceId: string;
}

export interface ReminderDeliveryDeps {
  sendEmail: typeof sendEmail;
  sendSms: typeof sendSms;
  memberPhone: typeof memberPhone;
  sendPushToUser: typeof sendPushToUser;
}

const defaultDeps: ReminderDeliveryDeps = {
  sendEmail,
  sendSms,
  memberPhone,
  sendPushToUser,
};

/** One row per channel — push fires exactly once per booking reminder. */
export function buildBookingReminderRows(input: {
  id: string;
  communityId: string;
  memberEmail: string;
  memberName: string;
  amenity: string;
  date: string;
  startTime: string;
  sendAt: Date;
}): ScheduledReminderRow[] {
  const subject = `Reminder: ${input.amenity} in 3 hours`;
  const body = `Hi ${input.memberName}, your ${input.amenity} booking is at ${input.startTime} on ${input.date}.`;
  const base = {
    communityId: input.communityId,
    userEmail: input.memberEmail,
    userName: input.memberName,
    subject,
    body,
    sendAt: input.sendAt,
    referenceType: "booking",
    referenceId: input.id,
  };
  return [
    { ...base, channel: "sms" },
    { ...base, channel: "email" },
    { ...base, channel: "push" },
  ];
}

/** Lead time before booking start when the 3-channel reminder becomes due. */
export const BOOKING_REMINDER_LEAD_MS = 3 * 60 * 60 * 1000;

/**
 * Cron must run more often than this lead time, or skip-after-start (c7672c8)
 * permanently blacks out daytime bookings when the job only runs once daily.
 * Fifteen minutes leaves headroom for GitHub Actions schedule drift.
 */
export const BOOKING_REMINDER_CRON_MAX_INTERVAL_MS = 15 * 60 * 1000;

/** A 3-hour reminder is only worth sending while the booking has not started. */
export function bookingHasNotStarted(start: Date, now: Date): boolean {
  return start.getTime() > now.getTime();
}

/**
 * True when a cron tick at `now` can still deliver a reminder that became due at
 * `start - 3h` before the booking starts. Daily crons fail this for most slots.
 */
export function cronCanDeliverBookingReminder(input: {
  bookingStart: Date;
  cronNow: Date;
  leadMs?: number;
}): boolean {
  const leadMs = input.leadMs ?? BOOKING_REMINDER_LEAD_MS;
  const sendAt = input.bookingStart.getTime() - leadMs;
  if (input.cronNow.getTime() < sendAt) return false;
  return bookingHasNotStarted(input.bookingStart, input.cronNow);
}

export function reminderLogAction(channel: ReminderChannel): string {
  switch (channel) {
    case "sms":
      return "SMS reminder";
    case "email":
      return "Email reminder";
    case "push":
      return "Push reminder";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

/** Delivers a single scheduled notification on its channel only. */
export async function deliverScheduledReminder(
  notification: {
    channel: string;
    userEmail: string;
    subject: string;
    body: string;
  },
  deps: ReminderDeliveryDeps = defaultDeps,
): Promise<void> {
  const channel = notification.channel as ReminderChannel;
  switch (channel) {
    case "email":
      await deps.sendEmail({
        to: notification.userEmail,
        subject: notification.subject,
        body: notification.body,
      });
      break;
    case "sms": {
      const phone = await deps.memberPhone(notification.userEmail);
      if (phone) {
        await deps.sendSms({ to: phone, body: notification.body });
      }
      break;
    }
    case "push":
      await deps.sendPushToUser(notification.userEmail, {
        title: notification.subject,
        body: notification.body,
        url: "/member/bookings",
      });
      break;
    default:
      break;
  }
}
