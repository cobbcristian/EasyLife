import { describe, expect, it, vi } from "vitest";
import {
  buildBookingReminderRows,
  deliverScheduledReminder,
  reminderLogAction,
} from "@/lib/server/reminders";

describe("buildBookingReminderRows", () => {
  it("creates exactly one row per channel including push", () => {
    const sendAt = new Date("2026-06-28T07:00:00Z");
    const rows = buildBookingReminderRows({
      id: "bk1",
      communityId: "c1",
      memberEmail: "a@b.com",
      memberName: "Alex",
      amenity: "Tennis Court 1",
      date: "2026-06-28",
      startTime: "10:00",
      sendAt,
    });

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.channel).sort()).toEqual(["email", "push", "sms"]);
    expect(rows.every((r) => r.referenceId === "bk1")).toBe(true);
    expect(rows.every((r) => r.sendAt === sendAt)).toBe(true);
  });
});

describe("deliverScheduledReminder", () => {
  it("sends email only for email channel", async () => {
    const sendEmail = vi.fn().mockResolvedValue({ ok: true });
    const sendSms = vi.fn();
    const memberPhone = vi.fn();
    const sendPushToUser = vi.fn();

    await deliverScheduledReminder(
      {
        channel: "email",
        userEmail: "a@b.com",
        subject: "Hi",
        body: "Body",
      },
      { sendEmail, sendSms, memberPhone, sendPushToUser },
    );

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendSms).not.toHaveBeenCalled();
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("sends push only for push channel", async () => {
    const sendEmail = vi.fn();
    const sendSms = vi.fn();
    const memberPhone = vi.fn();
    const sendPushToUser = vi.fn().mockResolvedValue(1);

    await deliverScheduledReminder(
      {
        channel: "push",
        userEmail: "a@b.com",
        subject: "Reminder",
        body: "Court at 10",
      },
      { sendEmail, sendSms, memberPhone, sendPushToUser },
    );

    expect(sendPushToUser).toHaveBeenCalledOnce();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendSms).not.toHaveBeenCalled();
  });

  it("does not double-send push when processing email and sms rows separately", async () => {
    const sendPushToUser = vi.fn().mockResolvedValue(1);
    const deps = {
      sendEmail: vi.fn().mockResolvedValue({ ok: true }),
      sendSms: vi.fn().mockResolvedValue({ ok: true }),
      memberPhone: vi.fn().mockResolvedValue("+15551234567"),
      sendPushToUser,
    };

    await deliverScheduledReminder(
      { channel: "email", userEmail: "a@b.com", subject: "S", body: "B" },
      deps,
    );
    await deliverScheduledReminder(
      { channel: "sms", userEmail: "a@b.com", subject: "S", body: "B" },
      deps,
    );
    await deliverScheduledReminder(
      { channel: "push", userEmail: "a@b.com", subject: "S", body: "B" },
      deps,
    );

    expect(sendPushToUser).toHaveBeenCalledTimes(1);
  });
});

describe("reminderLogAction", () => {
  it("maps channels to log labels", () => {
    expect(reminderLogAction("email")).toBe("Email reminder");
    expect(reminderLogAction("sms")).toBe("SMS reminder");
    expect(reminderLogAction("push")).toBe("Push reminder");
  });
});
