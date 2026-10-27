/*
 * MOSAIC's service worker: push notifications only (no caching, no offline). A notification
 * replaces the one before it for the same conversation (its tag), so a burst of messages is one.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/messages";
  event.waitUntil(
    self.registration.showNotification(data.title || "MOSAIC", {
      body: data.body || "",
      tag: data.tag || "mosaic",
      renotify: false,
      icon: "/icon.png",
      badge: "/icon.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/messages", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if (w.url === url && "focus" in w) return w.focus();
      }
      for (const w of wins) {
        if ("navigate" in w && "focus" in w) {
          await w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
