/* Krishna Kuteer service worker: app files load from the phone instantly, then refresh quietly in the background.
   Google Sheets data requests are never touched here (they go straight to the network). */
const V = "kk-v26", FILES = ["./", "index.html", "hero.webp", "manifest.webmanifest", "icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.endsWith("/sw.js")) return;
  const key = r.mode === "navigate" ? "index.html" : r;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(key, { ignoreSearch: true });
    const net = fetch(r.mode === "navigate" ? "index.html" : r, { cache: "no-cache" }).then(async res => {
      if (res && res.ok) {
        if (hit && r.mode === "navigate") { const [a, b] = await Promise.all([hit.clone().text(), res.clone().text()]); if (a !== b) self.clients.matchAll().then(cs => cs.forEach(x => x.postMessage("updated"))); }
        c.put(key, res.clone());
      }
      return res;
    }).catch(() => hit);
    e.waitUntil(net.catch(() => {}));
    if (r.mode === "navigate") return Promise.race([net.then(x => x || hit), new Promise(res => setTimeout(() => res(hit), 4000))]).then(x => x || net);
    return hit || net;
  }));
});
