const CACHE_NAME = ‘guitartune-v1’;
const ASSETS = [
‘/’,
‘/index.html’,
‘/manifest.json’,
‘https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Playfair+Display:ital,wght@1,400;1,700&display=swap’
];

self.addEventListener(‘install’, (e) => {
e.waitUntil(
caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
);
self.skipWaiting();
});

self.addEventListener(‘activate’, (e) => {
e.waitUntil(
caches.keys().then(keys =>
Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
)
);
self.clients.claim();
});

self.addEventListener(‘fetch’, (e) => {
e.respondWith(
caches.match(e.request).then(cached => cached || fetch(e.request).then(response => {
if (response && response.status === 200 && response.type === ‘basic’) {
const clone = response.clone();
caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
}
return response;
})).catch(() => caches.match(’/index.html’))
);
});