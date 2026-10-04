/* sw.js - caché sencillo para que la app abra sin internet. */
const CACHE = 'fondos-vivos-v3';
const ARCHIVOS = [
  './',
  'index.html',
  'icono.svg',
  'icono-192.png',
  'icono-512.png',
  'manifest.webmanifest',
  'css/estilos.css',
  'js/nucleo.js',
  'js/paletas.js',
  'js/gif.js',
  'js/fondos.js',
  'js/rostros.js',
  'js/efectos.js',
  'js/sensores.js',
  'js/retrato.js',
  'js/exportar.js',
  'js/galeria.js',
  'js/app.js'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Primero la red (así los cambios se ven al recargar) y la caché como respaldo
   para cuando no hay internet. */
self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(
    fetch(ev.request).then((res) => {
      const copia = res.clone();
      caches.open(CACHE).then((c) => c.put(ev.request, copia)).catch(() => {});
      return res;
    }).catch(() => caches.match(ev.request).then((r) => r || caches.match('index.html')))
  );
});
