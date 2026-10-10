/* © 2026 HS Coaching – Tous droits réservés. Reproduction, extraction ou réutilisation, même partielle, interdites sans autorisation écrite. */
// Service worker — HS Coaching / Bibliothèque O2
// Cache l'app shell (les 4 pages + manifest + icônes) pour un chargement hors-ligne,
// et met en cache les réponses Supabase (exercices, images) en "stale-while-revalidate"
// pour que la bibliothèque reste consultable même avec un wifi de salle capricieux.

const CACHE_NAME = 'hs-coaching-v188';
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

// Pages HTML et scripts JS : on essaie d'abord le réseau pour que les mises à jour apparaissent
// dès l'ouverture suivante (le cache ne sert qu'en secours hors-ligne).
function networkFirst(request) {
  // cache:'no-cache' = on revalide toujours auprès du serveur (304 si inchangé) au lieu de
  // réutiliser une copie du cache HTTP (GitHub Pages en garde ~10 min), sinon un fichier
  // fraîchement mis en ligne peut rester périmé et se retrouver figé dans le cache de l'app.
  return fetch(request, { cache: 'no-cache' })
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return res;
    })
    .catch(() => caches.match(request).then((c) => c || caches.match('index.html')));
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
    const isPage = event.request.mode === 'navigate' || /\.html?$/.test(url.pathname) || url.pathname.endsWith('/');
    const isScript = /\.(js|css)$/.test(url.pathname);   // les scripts et feuilles de style suivent la même règle que les pages : toujours à jour
    event.respondWith((isPage || isScript) ? networkFirst(event.request) : cacheFirst(event.request));
  } else {
    // Endpoints propres à un utilisateur (messages, conversations, programmes assignés,
    // profil...) : jamais de cache, même en secours — toujours le réseau.
    const isPersonal = /\/(rest\/v1|auth\/v1|functions\/v1)\//.test(url.pathname) && !/\/rest\/v1\/exercises\b/.test(url.pathname);
    if (isPersonal) {
      event.respondWith(fetch(event.request));
    } else {
      // Exercices et images : mise en cache "stale-while-revalidate" pour un accès hors-ligne.
      event.respondWith(staleWhileRevalidate(event.request));
    }
  }
});


// ---- Notifications push (messages, autorisations, fin de repos) ----
self.addEventListener('push', (event) => {
  let d = {};
  try{ d = event.data ? event.data.json() : {}; }catch(e){ d = { title: 'HS Coaching', body: event.data ? event.data.text() : '' }; }
  const title = d.title || 'HS Coaching';
  const opts = {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || 'index.html' },
    vibrate: d.rest ? [400,150,400,150,400] : [200,100,200],
    silent: !!d.rest,            // fin de repos : vibration seulement, pas de son (Android ; sur iPhone, réglable dans Réglages > Notifications)
    requireInteraction: !!d.rest
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || 'index.html';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    for(const c of all){
      if('focus' in c){
        await c.focus();
        const page = url.split('#')[0], hash = url.indexOf('#') >= 0 ? url.slice(url.indexOf('#')+1) : '';
        if(c.url.split('#')[0].split('/').pop() === page){ c.postMessage({ type:'hs-go', hash }); return; }
        if('navigate' in c){ try{ await c.navigate(url); return; }catch(e){} }
      }
    }
    if(self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
