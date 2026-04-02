// ============================================================
// FORGED Service Worker v1.0
// Strategy : Cache-First for app shell
// AI hook  : Network-First bucket reserved (uncomment when ready)
// ============================================================

const APP_VERSION = 'forged-v1.0';
const CACHE_APP   = APP_VERSION + '-app';
const CACHE_AI    = APP_VERSION + '-ai';   // reserved for AI integration

const SHELL = [
  './index.html',
  './manifest.json',
  './icon.svg'
];

// ── INSTALL ─────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_APP)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: delete old caches ─────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_APP && k !== CACHE_AI)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ───────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // ── AI HOOK (uncomment when adding AI integration) ────────
  // if (url.hostname === 'generativelanguage.googleapis.com' ||
  //     url.hostname === 'openrouter.ai') {
  //   e.respondWith(networkFirstAI(e.request));
  //   return;
  // }
  // ─────────────────────────────────────────────────────────

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  e.respondWith(cacheFirst(e.request));
});

// ── STRATEGY: Cache-First ────────────────────────────────────
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CACHE_APP);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    if (req.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503 });
  }
}

// ── STRATEGY: Network-First (reserved for AI) ────────────────
// async function networkFirstAI(req) {
//   try {
//     const res = await fetch(req);
//     if (res.ok) {
//       const cache = await caches.open(CACHE_AI);
//       cache.put(req, res.clone());
//     }
//     return res;
//   } catch {
//     const cached = await caches.match(req, { cacheName: CACHE_AI });
//     return cached || new Response(
//       JSON.stringify({ error: 'AI unavailable offline' }),
//       { status: 503, headers: { 'Content-Type': 'application/json' } }
//     );
//   }
// }

// ── MESSAGE: force update from app ───────────────────────────
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
