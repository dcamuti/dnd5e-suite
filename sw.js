/* Service worker della Suite D&D 5E: rende la suite utilizzabile senza connessione.
   - Pagine: con la rete si usa sempre la versione online (e la copia locale viene aggiornata); senza rete, o se la rete
     non risponde entro pochi secondi, si usa la copia locale. Non c'è quindi il rischio di restare su una versione vecchia.
   - Font e icone: copia locale, perché non cambiano.
   - Mentre si naviga online, al massimo una volta l'ora, tutte le pagine vengono riscaricate in sottofondo: così anche
     i tool non aperti di recente sono aggiornati quando la rete manca.
   I dati della suite non passano di qui: restano nel localStorage e in IndexedDB del browser. */
const CACHE = "dnd5e-suite-v1", NET_TIMEOUT = 4000, REFRESH_EVERY = 3600000;
const PAGES = ["index.html", "characters/index.html", "npcs/index.html", "encounters/index.html", "world/index.html", "journal/index.html", "puzzles/index.html", "maps/index.html"];
const STATIC = ["manifest.webmanifest", "fonts/cinzel-latin-500-normal.woff2", "fonts/cinzel-latin-600-normal.woff2", "fonts/cinzel-latin-700-normal.woff2", "fonts/cinzel-decorative-latin-700-normal.woff2",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"];
const abs = p => new URL(p, self.registration.scope).href;
let lastRefresh = 0;

/* scarica una risorsa saltando la cache HTTP del browser e la mette nella copia locale */
async function store(cache, path) {
  const res = await fetch(abs(path), { cache: "no-cache" });
  if (res.ok) await cache.put(abs(path), res);
  return res.ok;
}
async function refreshAll() {
  lastRefresh = Date.now();
  const cache = await caches.open(CACHE);
  await Promise.all(PAGES.map(p => store(cache, p).catch(() => false)));
}

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PAGES.concat(STATIC).map(p => store(cache, p)));
    lastRefresh = Date.now();
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k.indexOf("dnd5e-suite-") === 0) await caches.delete(k);
    await self.clients.claim();
  })());
});

/* la cartella di un tool e il suo index.html sono la stessa pagina */
function cacheKey(url) {
  const u = new URL(url); u.hash = ""; u.search = "";
  if (u.pathname.endsWith("/")) u.pathname += "index.html";
  return u.href;
}
async function networkFirst(req) {
  const cache = await caches.open(CACHE), key = cacheKey(req.url);
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), NET_TIMEOUT);
    const res = await fetch(req, { signal: ctl.signal }); clearTimeout(t);
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key);
    if (hit) return hit;
    throw err;
  }
}
async function cacheFirst(req) {
  const cache = await caches.open(CACHE), key = cacheKey(req.url), hit = await cache.match(key);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(key, res.clone());
  return res;
}
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.href.indexOf(self.registration.scope) !== 0) return;
  const fixed = /\.(woff2|png|svg)$/.test(url.pathname);
  e.respondWith(fixed ? cacheFirst(req) : networkFirst(req));
  if (req.mode === "navigate" && Date.now() - lastRefresh > REFRESH_EVERY) e.waitUntil(refreshAll());
});
