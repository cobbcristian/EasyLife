/**
 * Signup email rules: accept real-looking addresses, reject placeholders
 * and well-known disposable / reserved domains (e.g. johndoe@example.com).
 */

const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/** RFC 2606 / 6761 reserved + common disposable providers. */
const BLOCKED_DOMAINS = new Set([
  "example.com",
  "example.net",
  "example.org",
  "example.edu",
  "test.com",
  "test.org",
  "localhost",
  "invalid",
  "local",
  "mailinator.com",
  "mailinator.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "yopmail.com",
  "yopmail.fr",
  "trashmail.com",
  "trashmail.me",
  "throwaway.email",
  "fakeinbox.com",
  "getnada.com",
  "mailnesia.com",
  "dispostable.com",
  "maildrop.cc",
]);

const BLOCKED_TLDS = new Set(["test", "invalid", "localhost", "example", "local"]);

export type EmailPolicyIssue = "empty" | "format" | "placeholder";

export function normalizeSignupEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailPolicyIssues(email: string): EmailPolicyIssue[] {
  const normalized = normalizeSignupEmail(email);
  if (!normalized) return ["empty"];

  const issues: EmailPolicyIssue[] = [];
  if (!EMAIL_RE.test(normalized) || normalized.includes("..")) {
    issues.push("format");
    return issues;
  }

  const at = normalized.lastIndexOf("@");
  const domain = normalized.slice(at + 1);
  const labels = domain.split(".");
  const tld = labels[labels.length - 1] ?? "";

  if (
    BLOCKED_DOMAINS.has(domain) ||
    BLOCKED_TLDS.has(tld) ||
    domain.endsWith(".example.com") ||
    domain.endsWith(".example.net") ||
    domain.endsWith(".example.org") ||
    domain.endsWith(".test")
  ) {
    issues.push("placeholder");
  }

  return issues;
}

export function emailPolicyMessage(issues: EmailPolicyIssue[]): string {
  if (issues.includes("empty")) return "Email is required";
  if (issues.includes("format")) {
    return "Enter a valid email address (for example, name@gmail.com).";
  }
  if (issues.includes("placeholder")) {
    return "Use a real email address — placeholder or temporary addresses are not allowed.";
  }
  return "Enter a valid email address.";
}

export function isRealSignupEmail(email: string): boolean {
  return emailPolicyIssues(email).length === 0;
}
