const CACHE_VERSION = 'metrik-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const FONT_CACHE = `${CACHE_VERSION}-fonts`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/favicon.svg'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(APP_SHELL).catch(() => {
                // Silently continue if some assets aren't available during install
                return Promise.resolve();
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => !key.includes(CACHE_VERSION))
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip API requests - fetch from network only
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).catch(async () => {
                // No offline support for API calls
                return new Response('Offline', { status: 503 });
            })
        );
        return;
    }

    // Skip cross-origin requests
    if (url.origin !== self.location.origin) return;

    // Navigate requests (HTML)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(async () => {
                    const cached = await caches.match(request);
                    if (cached) return cached;
                    return caches.match('/index.html');
                })
        );
        return;
    }

    // Font requests - cache first, long term
    if (url.href.includes('fonts.googleapis.com') || url.href.includes('fonts.gstatic.com')) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (!response || response.status !== 200) return response;
                    const copy = response.clone();
                    caches.open(FONT_CACHE).then((cache) => cache.put(request, copy));
                    return response;
                });
            })
        );
        return;
    }

    // Image requests - cache first
    if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (!response || response.status !== 200) return response;
                    const copy = response.clone();
                    caches.open(IMAGE_CACHE).then((cache) => cache.put(request, copy));
                    return response;
                });
            })
        );
        return;
    }

    // JS, CSS, and other assets - network first, fall back to cache
    event.respondWith(
        fetch(request).then((response) => {
            if (!response || response.status !== 200 || response.type === 'error') {
                return caches.match(request).then((cached) => cached || response);
            }
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            return response;
        }).catch(() => {
            return caches.match(request).then((cached) => {
                if (cached) return cached;
                return new Response('Offline', { status: 503 });
            });
        })
    );
});