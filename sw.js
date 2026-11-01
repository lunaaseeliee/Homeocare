/**
 * HomeoCare Service Worker (PWA & Offline Resilience)
 * Clinic: Shri Siddhivinayak Clinic | Dr. Suraj D. Panigrahi
 *
 * Security & Compliance Rules:
 * 1. Only caches static application shell assets (HTML, CSS, JS, icons).
 * 2. NEVER caches confidential patient records, consultations, or auth credentials.
 * 3. Handles network loss transparently without fabricating stored updates.
 */

const CACHE_NAME = 'homeocare-v15-remove-field-taglines';

const STATIC_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/translations.js',
  '/supabase-client.js',
  '/lucide.min.js',
  '/supabase.min.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg'
];

// Install: Pre-cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL_ASSETS).catch((err) => {
        console.warn('[SW] Some static assets could not be pre-cached:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Prune stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy depending on request type
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. NEVER cache POST/PUT/DELETE or sensitive API endpoints
  if (req.method !== 'GET' || url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
    // Network-only for all dynamic and clinical APIs
    event.respondWith(
      fetch(req).catch(() => {
        // Return clear offline notification for API calls
        return new Response(
          JSON.stringify({
            ok: false,
            offline: true,
            error: 'No internet connection. Please reconnect to access live clinical records.'
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          }
        );
      })
    );
    return;
  }

  // 2. Static application shell: Network-First with Cache Fallback (guarantees fresh code while preserving offline resilience)
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (req.mode === 'navigate') return caches.match('/index.html');
          return new Response('Offline: Content unavailable without network connection.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});
