import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

export const BIOMETRIC_PREF_KEY = "plaza_biometric_enabled";

export async function isBiometricHardwareAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    return LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

export async function getBiometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (
      types.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      )
    ) {
      return Platform.OS === "ios" ? "Face ID" : "Face unlock";
    }
    if (
      types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    ) {
      return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    }
  } catch {
    /* ignore */
  }
  return "Biometrics";
}

export async function isBiometricSignInEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function setBiometricSignInEnabled(
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, "1");
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_PREF_KEY);
  }
}

export async function authenticateWithBiometric(
  promptMessage: string,
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Use password",
      fallbackLabel: "Use password",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
