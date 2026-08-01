const CACHE_NAME = "easy-life-v1";
const STATIC_ASSETS = [
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg",
  "/manifest.json",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // API calls: network only
  if (url.pathname.startsWith("/api/")) return;

  // Static assets: cache-first
  if (STATIC_ASSETS.some((asset) => url.pathname === asset)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // HTML pages: network-first with offline fallback
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request).catch(() => caches.match("/member") || new Response("Offline"))
    );
    return;
  }
});

// Push notifications
self.addEventListener("push", (event) => {
  let data = { title: "Easy Life", body: "You have a new notification.", url: "/member" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* use defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [100, 50, 100],
      data: { url: data.url ?? "/member" },
      actions: [
        { action: "open", title: "Open" },
        { action: "dismiss", title: "Dismiss" },
      ],
    })
  );
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  if (event.action === "dismiss") return;
  
  const url = event.notification.data?.url ?? "/member";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});
