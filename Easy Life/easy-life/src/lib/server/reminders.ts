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
