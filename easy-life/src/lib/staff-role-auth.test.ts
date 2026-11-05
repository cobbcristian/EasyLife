import { describe, expect, it } from "vitest";
import {
  assignableStaffRoles,
  canAssignStaffRole,
  canEditStaffProfiles,
  canMutateStaffMember,
  isStaffRole,
} from "./staff-role-auth";

describe("staff-role-auth", () => {
  it("lets admin, pm, and board open the staff profiles API", () => {
    expect(canEditStaffProfiles("admin")).toBe(true);
    expect(canEditStaffProfiles("pm")).toBe(true);
    expect(canEditStaffProfiles("board")).toBe(true);
    expect(canEditStaffProfiles("member")).toBe(false);
  });

  it("recognizes staff roles only", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("pm")).toBe(true);
    expect(isStaffRole("board")).toBe(true);
    expect(isStaffRole("member")).toBe(false);
  });

  it("blocks pm/board from assigning admin", () => {
    expect(canAssignStaffRole("pm", "admin")).toBe(false);
    expect(canAssignStaffRole("board", "admin")).toBe(false);
    expect(canAssignStaffRole("admin", "admin")).toBe(true);
    expect(canAssignStaffRole("pm", "pm")).toBe(true);
    expect(canAssignStaffRole("board", "board")).toBe(true);
  });

  it("blocks pm/board from mutating an existing admin", () => {
    expect(canMutateStaffMember("pm", "admin")).toBe(false);
    expect(canMutateStaffMember("board", "admin")).toBe(false);
    expect(canMutateStaffMember("admin", "admin")).toBe(true);
    expect(canMutateStaffMember("pm", "board")).toBe(true);
  });

  it("lists only roles the actor may assign", () => {
    expect(assignableStaffRoles("admin")).toEqual(["admin", "pm", "board"]);
    expect(assignableStaffRoles("pm")).toEqual(["pm", "board"]);
    expect(assignableStaffRoles("board")).toEqual(["pm", "board"]);
    expect(assignableStaffRoles("member")).toEqual([]);
  });
});
