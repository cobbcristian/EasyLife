export function normalizeReplySubject(subject: string): string {
  let s = subject.trim();
  while (/^re:\s*/i.test(s)) {
    s = s.replace(/^re:\s*/i, "").trim();
  }
  return s.toLowerCase() || "(no subject)";
}

export function contactMessageThreadKey(
  providerEmail: string,
  message: { senderEmail: string; recipient: string; subject: string },
): string {
  const provider = providerEmail.toLowerCase();
  const counterparty =
    message.senderEmail.toLowerCase() === provider
      ? message.recipient.toLowerCase()
      : message.senderEmail.toLowerCase();
  return `${counterparty}::${normalizeReplySubject(message.subject)}`;
}

export type ContactMessageRow = {
  id: string;
  communityId: string;
  senderName: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  message: string;
  status: string;
  createdAt: Date;
};

export type ContactMessageThread = {
  id: string;
  counterpartyName: string;
  counterpartyEmail: string;
  subject: string;
  community: string;
  preview: string;
  time: Date;
  unread: boolean;
  messages: Array<{
    id: string;
    body: string;
    from: string;
    fromEmail: string;
    isMine: boolean;
    time: Date;
    unread: boolean;
  }>;
};

export function buildContactMessageThreads(
  providerEmail: string,
  rows: ContactMessageRow[],
): ContactMessageThread[] {
  const provider = providerEmail.toLowerCase();
  const byThread = new Map<string, ContactMessageThread>();

  for (const row of rows) {
    const threadId = contactMessageThreadKey(providerEmail, row);
    const isMine = row.senderEmail.toLowerCase() === provider;
    const counterpartyEmail = isMine
      ? row.recipient.toLowerCase()
      : row.senderEmail.toLowerCase();
    const unread = !isMine && row.status === "delivered";

    const entry = {
      id: row.id,
      body: row.message,
      from: row.senderName,
      fromEmail: row.senderEmail,
      isMine,
      time: row.createdAt,
      unread,
    };

    const existing = byThread.get(threadId);
    if (!existing) {
      byThread.set(threadId, {
        id: threadId,
        counterpartyName: isMine ? row.recipient : row.senderName,
        counterpartyEmail,
        subject: row.subject.replace(/^(?:re:\s*)+/i, "").trim() || row.subject,
        community: row.communityId,
        preview: row.message,
        time: row.createdAt,
        unread,
        messages: [entry],
      });
      continue;
    }

    existing.messages.push(entry);
    if (row.createdAt > existing.time) {
      existing.time = row.createdAt;
      existing.preview = row.message;
    }
    if (unread) existing.unread = true;
    if (!isMine) {
      existing.counterpartyName = row.senderName;
      existing.counterpartyEmail = row.senderEmail.toLowerCase();
    }
  }

  return [...byThread.values()]
    .map((thread) => ({
      ...thread,
      messages: [...thread.messages].sort(
        (a, b) => a.time.getTime() - b.time.getTime(),
      ),
    }))
    .sort((a, b) => b.time.getTime() - a.time.getTime());
}
