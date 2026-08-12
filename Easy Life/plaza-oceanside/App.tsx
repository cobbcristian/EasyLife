import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Notifications from "expo-notifications";
import { sessionBridgeUrl } from "./src/api";
import { ensurePushRegistered, unregisterPush } from "./src/push";
import {
  APP_NAME,
  API_BASE_URL,
  TENANT_GO_PATH,
} from "./src/config";

WebBrowser.maybeCompleteAuthSession();

const SESSION_KEY = "plaza_oceanside_token";
const BRAND = "#002856";
const ACCENT = "#0e7490";
const OAUTH_RETURN = "plaza-oceanside://oauth";
const AUTH_URI = `${API_BASE_URL}${TENANT_GO_PATH}`;

type Mode = "auth" | "portal";

/** Capture web session JWT after password / register login inside the WebView. */
const SESSION_CAPTURE_JS = `
  (function () {
    try {
      var p = location.pathname || '';
      if (
        p.indexOf('/login') === 0 ||
        p.indexOf('/go/') === 0 ||
        p.indexOf('/register') === 0 ||
        p.indexOf('/signup') === 0 ||
        p.indexOf('/api/') === 0
      ) {
        true;
        return;
      }
      var authed =
        p.indexOf('/member') === 0 ||
        p.indexOf('/provider') === 0 ||
        p.indexOf('/dashboard') === 0 ||
        p.indexOf('/board') === 0 ||
        p.indexOf('/pm') === 0 ||
        p.indexOf('/social') === 0;
      if (!authed) { true; return; }
      if (window.__plazaTokenCapture) { true; return; }
      window.__plazaTokenCapture = true;
      fetch('/api/mobile/issue-token', { credentials: 'include' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.token && window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: 'plaza-session', token: d.token })
            );
          }
        })
        .catch(function () { window.__plazaTokenCapture = false; });
    } catch (e) {}
    true;
  })();
`;

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

function AppInner() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webRef = useRef<any>(null);
  const [mode, setMode] = useState<Mode>("auth");
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hidePortalBar, setHidePortalBar] = useState(false);
  const [authKey, setAuthKey] = useState(0);

  const portalUri = useMemo(
    () => (token ? sessionBridgeUrl(token) : null),
    [token],
  );

  async function enterPortal(nextToken: string) {
    await SecureStore.setItemAsync(SESSION_KEY, nextToken);
    setToken(nextToken);
    setMode("portal");
  }

  async function handleOAuthReturnUrl(url: string) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "plaza-oceanside:") return;
      const nextToken = parsed.searchParams.get("token");
      if (nextToken) await enterPortal(nextToken);
    } catch {
      /* ignore */
    }
  }

  async function startNativeOAuth(rawUrl: string) {
    try {
      const url = new URL(rawUrl);
      url.searchParams.set("mobile", "plaza");
      const result = await WebBrowser.openAuthSessionAsync(
        url.toString(),
        OAUTH_RETURN,
      );
      if (result.type === "success" && result.url) {
        await handleOAuthReturnUrl(result.url);
      }
    } catch {
      /* user cancelled / browser unavailable */
    }
  }

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
    const sub = Linking.addEventListener("url", ({ url }) => {
      void handleOAuthReturnUrl(url);
    });
    void Linking.getInitialURL().then((url) => {
      if (url) void handleOAuthReturnUrl(url);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (!token || mode !== "portal") return;
    void ensurePushRegistered(token, { request: false });
  }, [token, mode]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const target = response.notification.request.content.data?.url;
      if (typeof target !== "string" || !webRef.current) return;
      const path = target.startsWith("http") ? target : `${API_BASE_URL}${target}`;
      webRef.current.injectJavaScript(
        `window.location.assign(${JSON.stringify(path)}); true;`,
      );
    });
    return () => sub.remove();
  }, []);

  async function onSignOut() {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    setToken(null);
    setMode("auth");
    setAuthKey((k) => k + 1);
  }

  const onShouldStart = useCallback(
    (req: { url: string; isTopFrame?: boolean }) => {
      const url = req.url;
      if (req.isTopFrame !== true) return true;

      if (url.startsWith("mailto:") || url.startsWith("tel:")) {
        void Linking.openURL(url);
        return false;
      }
      if (url.startsWith("about:") || url.startsWith("blob:") || url.startsWith("data:")) {
        return url.startsWith("about:");
      }

      // SSO must leave the embedded WebView (Google blocks WebView user-agents).
      if (
        url.includes("/api/auth/oauth/") &&
        !url.includes("/callback") &&
        !url.includes("mobile=plaza")
      ) {
        void startNativeOAuth(url);
        return false;
      }

      if (url.startsWith("http://") || url.startsWith("https://")) {
        try {
          const host = new URL(url).hostname.toLowerCase();
          const apiHost = new URL(API_BASE_URL).hostname;
          // Payment portals must leave the shell — no in-app back chrome on third-party sites.
          if (
            host === "clickpay.com" ||
            host.endsWith(".clickpay.com") ||
            host === "www.clickpay.com" ||
            host.includes("clickpay")
          ) {
            void Linking.openURL(url);
            return false;
          }
          const allowed =
            host === apiHost ||
            host.endsWith(".azurewebsites.net") ||
            host.endsWith(".vercel.app") ||
            host === "oceansideresidents.com" ||
            host.endsWith(".oceansideresidents.com") ||
            host.endsWith(".stripe.com") ||
            host.includes("oceanside") ||
            host.includes("google") ||
            host.includes("microsoft") ||
            host.includes("live.com") ||
            host.includes("apple");
          if (!allowed) {
            void Linking.openURL(url);
            return false;
          }
          return true;
        } catch {
          return true;
        }
      }

      if (url.startsWith("plaza-oceanside://")) {
        void handleOAuthReturnUrl(url);
        return false;
      }

      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function onWebMessage(event: { nativeEvent: { data: string } }) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        token?: string;
        chromeless?: boolean;
        filename?: string;
        ics?: string;
        enabled?: boolean;
      };
      if (data?.type === "plaza-session" && data.token) {
        void enterPortal(data.token);
        return;
      }
      if (data?.type === "plaza-push") {
        if (data.enabled && token) {
          void ensurePushRegistered(token, { request: true });
        } else if (token) {
          void unregisterPush(token);
        }
        return;
      }
      if (data?.type === "plaza-chromeless") {
        setHidePortalBar(Boolean(data.chromeless));
        return;
      }
      if (data?.type === "plaza-ics" && data.ics) {
        const title = data.filename ?? "event.ics";
        void Share.share(
          Platform.OS === "ios"
            ? {
                url: `data:text/calendar;charset=utf-8,${encodeURIComponent(data.ics)}`,
                title,
              }
            : {
                message: data.ics,
                title,
              },
        ).catch(() => {
          /* cancelled */
        });
      }
    } catch {
      /* ignore */
    }
  }

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
      <SafeAreaView style={styles.flex} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        {!hidePortalBar ? (
          <View style={styles.portalBar}>
            {canGoBack ? (
              <Pressable
                onPress={() => webRef.current?.goBack?.()}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Text style={styles.link}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.portalBarSpacer} />
            )}
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
          originWhitelist={["*"]}
          applicationNameForUserAgent="PlazaOceansideApp/1"
          allowsBackForwardNavigationGestures
          injectedJavaScriptBeforeContentLoaded={portalInjectedJs}
          injectedJavaScript={portalInjectedJs}
          onMessage={onWebMessage}
          onNavigationStateChange={(nav: { canGoBack?: boolean; url?: string }) => {
            setCanGoBack(Boolean(nav.canGoBack));
            const path = nav.url
              ? (() => {
                  try {
                    return new URL(nav.url).pathname;
                  } catch {
                    return "";
                  }
                })()
              : "";
            if (path.includes("/messages") || path.includes("/help-desk")) {
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

  // Full web login: SSO, resident register, provider signup.
  return (
    <SafeAreaView style={styles.flex} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <WebView
        key={authKey}
        source={{ uri: AUTH_URI }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled={false}
        originWhitelist={["*"]}
        applicationNameForUserAgent="PlazaOceansideApp/1"
        allowsBackForwardNavigationGestures
        injectedJavaScript={SESSION_CAPTURE_JS}
        onMessage={onWebMessage}
        onNavigationStateChange={() => {
          webRef.current?.injectJavaScript?.(SESSION_CAPTURE_JS);
        }}
        onShouldStartLoadWithRequest={onShouldStart}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator color={ACCENT} size="large" />
          </View>
        )}
      />
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
    textAlign: "center",
    marginHorizontal: 8,
    fontWeight: "700",
    color: BRAND,
    fontSize: 14,
  },
  portalBarSpacer: { width: 48 },
  link: { color: ACCENT, fontWeight: "600", minWidth: 48 },
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
