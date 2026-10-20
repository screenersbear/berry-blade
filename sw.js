// Berry Blade (phone) offline (the user, 2026-10-17: "is the phone version offline and will auto update whenever it connects online?").
// The first visit stores every file the game needs on the phone, so after that it plays with no connection at all, the 3D engine
// (three.js) and the fonts included. Whenever it's online it checks for a new version: this file is rewritten by build_phone.py
// with a new VERSION every time the game changes, so the phone sees the difference, downloads the new files in the background and
// swaps to them (touch.js reloads into it at the menu). Template: .claude/berry-tools/phone/sw.js; the build fills in the two lists.
const VERSION = "berry-d800aa67d9b5";
const LOCAL = ["./", "./ambience.js", "./beps.js", "./characters.js", "./charkit.js", "./dawn.js", "./editor.js", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./index.html", "./manifest.webmanifest", "./score.js", "./sfx.js", "./shore.js", "./story.js", "./touch.js"];                       // the game's own files (this folder)
const LIB = "berry-lib-three-0.160.0";         // the engine and the fonts: their addresses never change, so they're kept across versions
const REMOTE = ["https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js", "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js", "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js"];                     // the engine's files (read from the game's import map by the build)
const FONTS = "https://fonts.googleapis.com/css2?family=Bungee&family=Jost:wght@400;500;600;700&display=swap";                       // the fonts' stylesheet (index.html's link); the font files it lists are kept too
const LIB_HOSTS = /^(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(LOCAL.map(u => new Request(u, { cache: "reload" })));     // (straight from the server, never a stale copy)
    const lib = await caches.open(LIB);
    for (const u of REMOTE) if (!(await lib.match(u))) { try { const r = await fetch(u, { mode: "cors" }); if (r.ok) await lib.put(u, r); } catch { } }
    if (!(await lib.match(FONTS))) try {           // (so the right lettering shows offline from the very first visit, not only the second)
      const r = await fetch(FONTS, { mode: "cors" });
      if (r.ok) { const css = await r.clone().text(); await lib.put(FONTS, r);
        for (const m of css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) { try { const f = await fetch(m[1], { mode: "cors" }); if (f.ok) await lib.put(m[1], f); } catch { } } }
    } catch { }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION && k !== LIB) await caches.delete(k);   // the last version's files
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {            // the game's files: from the phone (the ?v= and ?mute bits don't matter)
    e.respondWith((async () => (await caches.match(r, { ignoreSearch: true, cacheName: VERSION })) || fetch(r).catch(async () =>
      r.mode === "navigate" ? (await caches.match("./index.html", { cacheName: VERSION })) || Response.error() : Response.error()))());
  } else if (LIB_HOSTS.test(u.host)) {           // the engine and the fonts: from the phone, fetched and kept the first time
    e.respondWith((async () => {
      const lib = await caches.open(LIB), hit = await lib.match(r.url); if (hit) return hit;
      const res = await fetch(r); if (res.ok || res.type === "opaque") lib.put(r.url, res.clone()); return res;
    })());
  }
});
