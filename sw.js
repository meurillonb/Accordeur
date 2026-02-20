// ───── SERVICE WORKER PWA CONFIGURATION ─────
const CACHE_VERSION = 'guitartune-v2';
const RUNTIME_CACHE = 'guitartune-runtime-v2';
const STATIC_CACHE = 'guitartune-static-v2';

const STATIC_ASSETS = [
    '/',
    '/index.html',
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

    // Skip cross-origin and non-GET requests
    if (url.origin !== self.location.origin && request.method !== 'GET') {
        return;
    }

    // Cache strategies by resource type
    if (request.destination === 'style' || request.destination === 'script' || request.destination === 'font') {
        // Stale-while-revalidate for stylesheets, scripts
        event.respondWith(cacheFirst(request));
    } else if (request.destination === 'image') {
        // Cache images
        event.respondWith(cacheFirst(request));
    } else if (request.method === 'GET') {
        // Network-first for HTML and API
        event.respondWith(networkFirst(request));
    }
});

// ───── CACHE STRATEGIES ─────
async function cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response && response.status === 200 && response.type === 'basic') {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.warn('[SW] Fetch failed:', error);
        // Return offline page if available
        return new Response('Offline - Document unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
        });
    }
}

async function networkFirst(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.log('[SW] Network failed, using cache:', error);
        const cached = await cache.match(request);
        if (cached) return cached;

        // Fallback to index.html for navigation
        if (request.mode === 'navigate' || request.destination === 'document') {
            return cache.match('/index.html') || 
                new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        }
    }
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