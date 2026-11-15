/* 离线缓存：优先取网络（保证更新），断网时回落到缓存 */
const CACHE = 'gk-review-v3';
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data.js',
  './pomodoro.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-180.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(PRECACHE.map(function (u) {
        return c.add(u).catch(function () { /* 单个失败不影响整体 */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function timeoutFetch(req, ms) {
  return new Promise(function (resolve, reject) {
    const timer = setTimeout(function () { reject(new Error('timeout')); }, ms);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      resolve(res);
    }).catch(function (err) {
      clearTimeout(timer);
      reject(err);
    });
  });
}

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    (async function () {
      const cache = await caches.open(CACHE);
      try {
        const res = await timeoutFetch(req, 2800);
        if (res && res.status === 200 && res.type !== 'opaque') {
          cache.put(req, res.clone()).catch(function () {});
        }
        return res;
      } catch (err) {
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === 'navigate') {
          const idx = await cache.match('./index.html');
          if (idx) return idx;
        }
        return new Response('当前处于离线状态，且该内容尚未缓存。', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })()
  );
});
