/** ASP.NET Identity–style rules used on Oceanside self-enroll. */

export type PasswordPolicyIssue =
  | "non_alphanumeric"
  | "lowercase"
  | "uppercase"
  | "mismatch"
  | "min_length";

export function passwordPolicyIssues(
  password: string,
  confirm?: string,
): PasswordPolicyIssue[] {
  const issues: PasswordPolicyIssue[] = [];
  if (password.length < 6) issues.push("min_length");
  if (!/[a-z]/.test(password)) issues.push("lowercase");
  if (!/[A-Z]/.test(password)) issues.push("uppercase");
  if (!/[^a-zA-Z0-9]/.test(password)) issues.push("non_alphanumeric");
  if (confirm !== undefined && password !== confirm) issues.push("mismatch");
  return issues;
}

export function passwordPolicyMessages(
  issues: PasswordPolicyIssue[],
): string[] {
  const messages: string[] = [];
  if (issues.includes("non_alphanumeric")) {
    messages.push(
      "Passwords must have at least one non letter or digit character.",
    );
  }
  if (issues.includes("lowercase")) {
    messages.push("Passwords must have at least one lowercase ('a'-'z').");
  }
  if (issues.includes("uppercase")) {
    messages.push("Passwords must have at least one uppercase ('A'-'Z').");
  }
  if (issues.includes("min_length")) {
    messages.push("Passwords must be at least 6 characters.");
  }
  return messages;
}

export function isPasswordStrongEnough(password: string): boolean {
  return (
    passwordPolicyIssues(password).filter((i) => i !== "mismatch").length === 0
  );
}
