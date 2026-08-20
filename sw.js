const CACHE_NAME = 'fishing-v10';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(names => Promise.all(
    names.map(n => caches.delete(n))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('open-meteo.com')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // Static files always from network, no cache
  e.respondWith(fetch(e.request));
});
