/**
 * Push registration is intentionally a no-op until Apple App ID capabilities
 * include Push Notifications and EAS regenerates the App Store profile.
 * Re-enable with expo-notifications + the config plugin once that is done.
 */
export async function ensurePushRegistered(
  _sessionToken: string,
): Promise<void> {
  /* deferred — provisioning profile lacks aps-environment */
}
