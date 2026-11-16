/* Ibagué · Servicios de la ciudad — Service Worker
   Repo: https://tolitecnoapp-glitch.github.io/IBAGUETQM/
   Estrategia: cache-first para la app shell, red primero para el resto.
*/
const CACHE = 'ibague-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './hogar.html',
  './kids.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Solo se maneja el mismo origen (el repo); el resto va directo a red
  if (url.origin !== self.location.origin) return;

  // Navegaciones (HTML): red primero, respaldo a caché
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copia)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Recursos estáticos: caché primero, luego red y se guarda
  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copia)).catch(() => {});
          return res;
        })
        .catch(() => hit);
    })
  );
});
