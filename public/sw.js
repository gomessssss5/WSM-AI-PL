self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('wsm-ai-store').then((cache) => cache.addAll([
      '/'
    ])),
  );
});

self.addEventListener('fetch', (e) => {
  console.log(e.request.url);
});
