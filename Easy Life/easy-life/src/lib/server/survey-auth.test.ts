import { describe, expect, it } from "vitest";
import {
  isOptionForSurvey,
  isSurveyInCommunity,
} from "@/lib/server/survey-auth";

describe("survey vote scoping", () => {
  it("rejects votes when the survey belongs to another club", () => {
    expect(
      isSurveyInCommunity("iron-lake", "oceanside-residents"),
    ).toBe(false);
    expect(isSurveyInCommunity("oceanside-residents", null)).toBe(false);
    expect(
      isSurveyInCommunity("oceanside-residents", "oceanside-residents"),
    ).toBe(true);
  });

  it("rejects options that do not belong to the survey", () => {
    expect(isOptionForSurvey("survey-a", "survey-b")).toBe(false);
    expect(isOptionForSurvey("survey-a", "survey-a")).toBe(true);
  });
});
