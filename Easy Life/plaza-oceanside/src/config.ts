import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

/** Live Easy Life API (Azure App Service). */
export const API_BASE_URL =
  (extra.apiBaseUrl as string | undefined) ??
  "https://easylife-plaza-app.azurewebsites.net";

export const COMMUNITY_ID =
  (extra.communityId as string | undefined) ?? "oceanside-residents";

export const TENANT_GO_PATH =
  (extra.tenantGoPath as string | undefined) ?? "/go/oceansideresidents";

export const APP_NAME = "The Plaza at Oceanside";

export const PRIVACY_URL = `${API_BASE_URL}/privacy`;
export const SUPPORT_EMAIL =
  (extra.supportEmail as string | undefined) ?? "cobbcristian17@gmail.com";
