/**
 * Pure helpers for survey vote authorization (unit-tested without Prisma).
 */

export function isSurveyInCommunity(
  surveyCommunityId: string,
  sessionCommunityId: string | null | undefined,
): boolean {
  if (!sessionCommunityId) return false;
  return surveyCommunityId === sessionCommunityId;
}

export function isOptionForSurvey(
  optionSurveyId: string,
  surveyId: string,
): boolean {
  return optionSurveyId === surveyId;
}
