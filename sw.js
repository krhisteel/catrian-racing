// App instalable: guarda la tienda para abrir rápido y funcionar sin conexión.
// Precios, stock y pedidos siempre se piden en línea (Supabase no pasa por aquí).
const VERSION = 'catrian-v2';
const CORE = ['/', '/index.html', '/styles.css', '/fx.css', '/store.js', '/fx.js', '/site.js', '/supabase-config.js',
    '/img/icons/icon-192.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin') || url.pathname === '/sw.js') return;

    // Páginas: primero la red (siempre lo último); sin conexión, la copia guardada.
    if (req.mode === 'navigate') {
        event.respondWith(fetch(req).then((res) => {
            if (res.ok && url.pathname === '/') {
                const copy = res.clone();
                caches.open(VERSION).then((cache) => cache.put('/', copy));
            }
            return res;
        }).catch(() => caches.match('/').then((r) => r || caches.match('/index.html'))));
        return;
    }

    // Código y estilos: primero la red (así una corrección llega de inmediato); sin conexión, la copia.
    if (/\.(css|js|webmanifest)$/.test(url.pathname)) {
        event.respondWith(fetch(req).then((res) => {
            if (res.ok) {
                const copy = res.clone();
                caches.open(VERSION).then((cache) => cache.put(req, copy));
            }
            return res;
        }).catch(() => caches.match(req)));
        return;
    }

    // Imágenes: se sirven al instante desde la copia y se actualizan por detrás.
    if (/\.(png|svg|jpg|jpeg|webp)$/.test(url.pathname)) {
        event.respondWith(caches.open(VERSION).then((cache) => cache.match(req).then((hit) => {
            const fresh = fetch(req).then((res) => {
                if (res.ok) cache.put(req, res.clone());
                return res;
            }).catch(() => hit);
            return hit || fresh;
        })));
    }
});
