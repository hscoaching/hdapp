// Service worker — HS Coaching / Bibliothèque O2
// Cache l'app shell (les 4 pages + manifest + icônes) pour un chargement hors-ligne,
// et met en cache les réponses Supabase (exercices, images) en "stale-while-revalidate"
// pour que la bibliothèque reste consultable même avec un wifi de salle capricieux.

const CACHE_NAME = 'hs-coaching-v25';
const APP_SHELL = [
  'index.html',
  'programmes.html',
  'compte.html',
  'admin.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match('index.html'));
  });
}

function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Une requête explicitement marquée no-store (messages, données propres à un
  // utilisateur juste après un envoi) ne doit jamais être servie depuis le cache :
  // on va toujours chercher la réponse fraîche sur le réseau.
  if (event.request.cache === 'no-store') {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request));
  } else {
    // Endpoints propres à un utilisateur (messages, conversations, programmes assignés,
    // profil...) : jamais de cache, même en secours — toujours le réseau.
    const isPersonal = /\/rest\/v1\/(messages|conversations|profiles|programs|program_exercises|coach_contact_requests|session_logs|sessions)\b/.test(url.pathname);
    if (isPersonal) {
      event.respondWith(fetch(event.request));
    } else {
      // Exercices et images : mise en cache "stale-while-revalidate" pour un accès hors-ligne.
      event.respondWith(staleWhileRevalidate(event.request));
    }
  }
});
