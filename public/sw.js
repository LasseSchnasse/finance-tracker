self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") return;
  event.respondWith(fetch(event.request));
});
