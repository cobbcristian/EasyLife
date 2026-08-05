import { describe, expect, it } from "vitest";
import {
  emailPolicyIssues,
  emailPolicyMessage,
  isRealSignupEmail,
} from "@/lib/email-policy";

describe("email-policy", () => {
  it("accepts normal personal emails", () => {
    expect(isRealSignupEmail("cobbcristian17@gmail.com")).toBe(true);
    expect(isRealSignupEmail("resident@oceansideresidents.com")).toBe(true);
    expect(isRealSignupEmail("  Jane.Doe+unit12@Outlook.com ")).toBe(true);
  });

  it("rejects empty and bad format", () => {
    expect(emailPolicyIssues("")).toEqual(["empty"]);
    expect(emailPolicyIssues("not-an-email")).toContain("format");
    expect(emailPolicyIssues("a@b")).toContain("format");
    expect(emailPolicyIssues("foo@.com")).toContain("format");
  });

  it("rejects placeholder and disposable domains", () => {
    expect(isRealSignupEmail("johndoe@example.com")).toBe(false);
    expect(isRealSignupEmail("testuser@example.org")).toBe(false);
    expect(isRealSignupEmail("x@mailinator.com")).toBe(false);
    expect(isRealSignupEmail("x@yopmail.com")).toBe(false);
    expect(emailPolicyIssues("johndoe@example.com")).toEqual(["placeholder"]);
    expect(emailPolicyMessage(["placeholder"])).toMatch(/real email/i);
  });
});
