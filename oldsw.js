const CACHE_NAME = "stopwatch-v1";

const urlsToCache = [
  "./",
  "./index.html",
  "./favicon.svg",
  "./icons.svg",
  "./assets/Logo.png",
  "./assets/index-BCiVsbfu.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
