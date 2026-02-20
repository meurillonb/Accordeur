// ───── SERVICE WORKER PWA CONFIGURATION ─────
const CACHE_VERSION = 'guitartune-v2';
const RUNTIME_CACHE = 'guitartune-runtime-v2';
const STATIC_CACHE = 'guitartune-static-v2';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/style.css',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Playfair+Display:ital,wght@1,400;1,700&display=swap',
    'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia.js-core.js',
    'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.js',
    'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia.wasm'
];

// ───── INSTALL ─────
self.addEventListener('install', (event) => {
    console.log('[SW] Install event');
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        }).catch(err => {
            console.warn('[SW] Cache failed for some assets:', err);
            return caches.open(STATIC_CACHE).then(cache => {
                // Cache essentiels only if others fail
                return cache.addAll(['/', '/index.html', '/manifest.json']);
            });
        })
    );
    self.skipWaiting();
});

// ───── ACTIVATE ─────
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// ───── FETCH STRATEGY ─────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Local files: cache-first strategy
    if (url.origin === self.location.origin) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // External resources by type
    if (request.destination === 'style' || request.destination === 'script' || request.destination === 'font') {
        event.respondWith(cacheFirst(request));
    } else if (request.destination === 'image') {
        event.respondWith(cacheFirst(request));
    } else {
        event.respondWith(networkFirst(request));
    }
});

// ───── CACHE STRATEGIES ─────
/**
 * Cache-first: Return cached version if available, otherwise fetch and cache
 * Used for: HTML, CSS, JS, Fonts, Images (mostly static content)
 */
async function cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) {
        console.log('[SW] Cache HIT:', request.url);
        return cached;
    }

    try {
        console.log('[SW] Fetching:', request.url);
        const response = await fetch(request);
        if (response && response.status === 200 && response.type === 'basic') {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.warn('[SW] Fetch failed (offline):', request.url, error);
        // Try to return cached version if available
        const fallback = await cache.match(request);
        if (fallback) return fallback;
        
        // Return offline page
        return new Response('Application hors ligne - Document non disponible', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
    }
}

/**
 * Network-first: Try network first, fallback to cache if offline
 * Used for: Pages HTML (want fresh content)
 */
async function networkFirst(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    try {
        console.log('[SW] Network fetch:', request.url);
        const response = await fetch(request);
        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.log('[SW] Network failed, using cache:', request.url);
        const cached = await cache.match(request);
        if (cached) return cached;

        // Fallback to index.html for navigation
        if (request.mode === 'navigate' || request.destination === 'document') {
            const indexPage = await cache.match('/index.html');
            if (indexPage) return indexPage;
        }
        
        return new Response('Hors ligne - Page non disponible', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
    }
}

// ───── CACHE MANAGEMENT ─────
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(cacheName => {
            console.log('[SW] Clearing cache:', cacheName);
            return caches.delete(cacheName);
        })
    );
}

// ───── MESSAGE HANDLING ─────
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        clearAllCaches();
    }
});