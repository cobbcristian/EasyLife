import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";
import * as SecureStore from "expo-secure-store";
import {
  loginResident,
  registerResident,
  sessionBridgeUrl,
  verifyMfaLogin,
} from "./src/api";
import { ensurePushRegistered } from "./src/push";
import {
  APP_NAME,
  API_BASE_URL,
  PRIVACY_URL,
  SUPPORT_EMAIL,
} from "./src/config";

const SESSION_KEY = "plaza_oceanside_token";
const BRAND = "#002856";
const ACCENT = "#0e7490";

type Mode = "login" | "register" | "pending" | "mfa" | "portal";

function AppInner() {
  // WebView class component refs don't type cleanly under RN 0.86.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webRef = useRef<any>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [hidePortalBar, setHidePortalBar] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const formMaxHeight = Math.round(windowHeight * 0.6);

  const portalUri = useMemo(
    () => (token ? sessionBridgeUrl(token) : null),
    [token],
  );

  useEffect(() => {
    void (async () => {
      try {
        const saved = await SecureStore.getItemAsync(SESSION_KEY);
        if (saved) {
          setToken(saved);
          setMode("portal");
        }
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android" || mode !== "portal") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack, mode]);

  // Register for remote push whenever we have a signed-in session.
  useEffect(() => {
    if (!token || mode !== "portal") return;
    void ensurePushRegistered(token);
  }, [token, mode]);

  async function onLogin() {
    setError(null);
    setBusy(true);
    try {
      const result = await loginResident(email, password);
      if (!result.ok) {
        if (result.pending) setMode("pending");
        setError(result.error);
        return;
      }
      if (result.mfaRequired && result.mfaToken) {
        setMfaToken(result.mfaToken);
        setMfaCode("");
        setMode("mfa");
        return;
      }
      if (!result.token) {
        setError("No session token returned");
        return;
      }
      await SecureStore.setItemAsync(SESSION_KEY, result.token);
      setToken(result.token);
      setMode("portal");
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyMfa() {
    setError(null);
    if (!mfaToken) {
      setMode("login");
      return;
    }
    setBusy(true);
    try {
      const result = await verifyMfaLogin(mfaToken, mfaCode);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!result.token) {
        setError("No session token returned");
        return;
      }
      await SecureStore.setItemAsync(SESSION_KEY, result.token);
      setToken(result.token);
      setMfaToken(null);
      setMfaCode("");
      setMode("portal");
    } finally {
      setBusy(false);
    }
  }

  async function onRegister() {
    setError(null);
    if (!name.trim()) {
      setError("Full name is required");
      return;
    }
    if (!unit.trim()) {
      setError("Unit number is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      const result = await registerResident({ email, password, name, unit });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.pending) {
        setMode("pending");
        return;
      }
      const login = await loginResident(email, password);
      if (login.ok && login.token) {
        await SecureStore.setItemAsync(SESSION_KEY, login.token);
        setToken(login.token);
        setMode("portal");
        return;
      }
      setMode("login");
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    setToken(null);
    setMode("login");
  }

  const onShouldStart = useCallback(
    (req: { url: string; isTopFrame?: boolean; navigationType?: string }) => {
      const url = req.url;

      // iOS/Android often omit isTopFrame. Only intercept explicit top-frame loads.
      // Cancelling subframe / fetch / asset requests freezes Next.js soft navigation.
      if (req.isTopFrame !== true) return true;

      if (url.startsWith("mailto:") || url.startsWith("tel:")) {
        void Linking.openURL(url);
        return false;
      }

      if (
        url.startsWith("about:") ||
        url.startsWith("blob:") ||
        url.startsWith("data:")
      ) {
        return true;
      }

      if (url.startsWith("http://") || url.startsWith("https://")) {
        try {
          const host = new URL(url).hostname;
          const apiHost = new URL(API_BASE_URL).hostname;
          const allowed =
            host === apiHost ||
            host.endsWith(".azurewebsites.net") ||
            host.endsWith(".vercel.app") ||
            host === "oceansideresidents.com" ||
            host.endsWith(".oceansideresidents.com") ||
            host.endsWith(".stripe.com") ||
            host.endsWith(".clickpay.com") ||
            host.includes("oceanside");
          if (!allowed) {
            void Linking.openURL(url);
            return false;
          }
          return true;
        } catch {
          return true;
        }
      }

      return true;
    },
    [],
  );

  const portalInjectedJs = `
    (function () {
      if (window.__plazaNavPatched) return true;
      window.__plazaNavPatched = true;
      document.documentElement.style.setProperty('scroll-behavior', 'auto');
      document.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a) return;
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
        if (href.indexOf('http') === 0) {
          try {
            var u = new URL(href);
            if (u.origin !== window.location.origin) return;
            href = u.pathname + u.search + u.hash;
          } catch (err) { return; }
        }
        if (href.charAt(0) !== '/') return;
        e.preventDefault();
        e.stopPropagation();
        window.location.assign(href);
      }, true);
      true;
    })();
  `;

  if (booting) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator color={ACCENT} size="large" />
        <Text style={styles.bootLabel}>{APP_NAME}</Text>
      </View>
    );
  }

  if (mode === "portal" && token && portalUri) {
    return (
      <SafeAreaView
        style={styles.flex}
        // Always keep top inset — chromeless chats still need the status-bar
        // gap or the thread title / back control sits under the notch.
        edges={["top", "left", "right"]}
      >
        <StatusBar style="dark" />
        {!hidePortalBar ? (
          <View style={styles.portalBar}>
            <Text style={styles.portalTitle} numberOfLines={1}>
              {APP_NAME}
            </Text>
            <Pressable onPress={() => void onSignOut()} hitSlop={12}>
              <Text style={styles.link}>Sign out</Text>
            </Pressable>
          </View>
        ) : null}
        <WebView
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={webRef as any}
          source={{ uri: portalUri }}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled={false}
          incognito={false}
          originWhitelist={["*"]}
          applicationNameForUserAgent="PlazaOceansideApp/1"
          allowsBackForwardNavigationGestures
          injectedJavaScriptBeforeContentLoaded={portalInjectedJs}
          injectedJavaScript={portalInjectedJs}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data) as {
                type?: string;
                chromeless?: boolean;
              };
              if (data?.type === "plaza-chromeless") {
                setHidePortalBar(Boolean(data.chromeless));
              }
            } catch {
              /* ignore non-json */
            }
          }}
          onNavigationStateChange={(nav: { canGoBack?: boolean; url?: string }) => {
            setCanGoBack(Boolean(nav.canGoBack));
            const path = nav.url ? (() => {
              try {
                return new URL(nav.url).pathname;
              } catch {
                return "";
              }
            })() : "";
            // Keep sign-out bar hidden while parked on any messages screen.
            if (
              path.includes("/messages") ||
              path.includes("/help-desk")
            ) {
              setHidePortalBar(true);
            } else if (!path.includes("/messages") && path.length > 0) {
              setHidePortalBar(false);
            }
          }}
          onShouldStartLoadWithRequest={onShouldStart}
        />
      </SafeAreaView>
    );
  }

  if (mode === "mfa") {
    return (
      <SafeAreaView
        style={[styles.flex, styles.pad]}
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style="dark" />
        <Image
          source={require("./assets/brand-wordmark.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.h1}>Two-factor code</Text>
        <Text style={styles.body}>
          Enter the 6-digit code from your authenticator app, or a recovery
          code.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput
          style={styles.input}
          placeholder="Authentication code"
          placeholderTextColor="#98a2b3"
          value={mfaCode}
          onChangeText={setMfaCode}
          autoCapitalize="characters"
          keyboardType="default"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />
        <Pressable
          style={[styles.button, busy && styles.buttonDisabled]}
          disabled={busy || mfaCode.trim().length < 6}
          onPress={() => void onVerifyMfa()}
        >
          <Text style={styles.buttonText}>
            {busy ? "Verifying…" : "Verify"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setMfaToken(null);
            setMfaCode("");
            setMode("login");
          }}
          hitSlop={12}
        >
          <Text style={styles.switch}>Back to sign in</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (mode === "pending") {
    return (
      <SafeAreaView
        style={[styles.flex, styles.pad]}
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style="dark" />
        <Image
          source={require("./assets/brand-wordmark.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.h1}>Pending approval</Text>
        <Text style={styles.body}>
          Thanks for registering. Association management will review your unit
          and account. You can sign in after you are approved.
        </Text>
        <Pressable style={styles.button} onPress={() => setMode("login")}>
          <Text style={styles.buttonText}>Back to sign in</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.flex}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={styles.pad}>
          <Image
            source={require("./assets/brand-wordmark.png")}
            style={mode === "register" ? styles.logoCompact : styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.h1}>{APP_NAME}</Text>
          <Text style={styles.sub}>
            {mode === "login"
              ? "Resident sign in"
              : "Create your account (unit required)"}
          </Text>
        </View>

        {/* Keep all fields in the top ~60% so the keyboard never covers them. */}
        <ScrollView
          style={{ maxHeight: formMaxHeight }}
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {mode === "register" ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#98a2b3"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Unit number (e.g. 1112)"
                placeholderTextColor="#98a2b3"
                value={unit}
                onChangeText={setUnit}
                autoCapitalize="characters"
              />
            </>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#98a2b3"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#98a2b3"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === "login" ? "password" : "new-password"}
            textContentType={mode === "login" ? "password" : "newPassword"}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, busy && styles.buttonDisabled]}
            disabled={busy}
            onPress={() => void (mode === "login" ? onLogin() : onRegister())}
          >
            <Text style={styles.buttonText}>
              {busy
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setError(null);
              setMode(mode === "login" ? "register" : "login");
            }}
          >
            <Text style={styles.switch}>
              {mode === "login"
                ? "New resident? Create an account"
                : "Already registered? Sign in"}
            </Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footerLinks}>
          <Pressable onPress={() => void Linking.openURL(PRIVACY_URL)}>
            <Text style={styles.footerLink}>Privacy</Text>
          </Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          >
            <Text style={styles.footerLink}>Support</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#ffffff" },
  pad: { paddingHorizontal: 24, paddingTop: 20 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND,
  },
  bootLabel: {
    marginTop: 16,
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  logo: { width: 240, height: 96, alignSelf: "center", marginBottom: 8 },
  logoCompact: {
    width: 160,
    height: 52,
    alignSelf: "center",
    marginBottom: 4,
  },
  formScroll: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  h1: {
    fontSize: 22,
    fontWeight: "700",
    color: BRAND,
    textAlign: "center",
  },
  sub: {
    marginTop: 6,
    marginBottom: 12,
    textAlign: "center",
    color: "#667085",
    fontSize: 14,
  },
  body: { marginTop: 12, marginBottom: 24, color: "#475467", lineHeight: 22 },
  input: {
    borderWidth: 1,
    borderColor: "#e4e7ec",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 16,
    color: "#0a0a0a",
    backgroundColor: "#fafbfc",
  },
  button: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  switch: {
    marginTop: 18,
    textAlign: "center",
    color: ACCENT,
    fontWeight: "600",
  },
  error: { color: "#b42318", marginBottom: 8, fontSize: 13 },
  footerLinks: {
    marginTop: "auto",
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  footerLink: { color: "#667085", fontSize: 13, fontWeight: "500" },
  footerDot: { color: "#98a2b3" },
  portalBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  portalTitle: {
    flex: 1,
    marginRight: 12,
    fontWeight: "700",
    color: BRAND,
    fontSize: 14,
  },
  link: { color: ACCENT, fontWeight: "600" },
  webviewLoading: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});
