/* ============================================================
   Service worker — what makes this installable, and what makes it
   work with no signal at all.

   Once installed, every file it has seen is served from the cache
   first, so the library opens on a phone in airplane mode, in a lift,
   or in an office with guest wifi that blocks everything. The answers
   never needed the network anyway; this just removes the download.

   Voice is the exception and always will be: the browser transcribes
   speech through its vendor's online service, so the microphone needs
   a connection even when the answers do not.

   Nothing is precached by name beyond the page itself. The public
   copy of this library ships three data packs fewer than the private
   one (the HR pack among them), and a hardcoded list would fail to
   install there the moment a name did not match. So files are cached
   as they are actually fetched — right for both copies, and for every
   pack added later.
   ============================================================ */

var VERSION = 'devqa-v3-fast';
var SHELL = ['./', './index.html'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(SHELL); })
      .catch(function () { /* offline on first run — runtime caching still fills it */ })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === VERSION ? null : caches.delete(k);   // drop old versions
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;   // never touch the speech service

  e.respondWith(
    caches.match(req).then(function (hit) {
      // Cached copy goes out immediately; a fresh one is fetched behind it
      // so the next open is up to date without ever waiting on the network.
      var live = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });

      return hit || live;
    })
  );
});

/* the page asks for this after an update so the new worker takes over at once */
self.addEventListener('message', function (e) {
  if (e.data === 'skip-waiting') self.skipWaiting();
});
