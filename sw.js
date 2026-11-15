/* 离线缓存
 * 页面骨架：优先取网络，超时或断网回落缓存（保证打开时拿到最新 HTML）
 * 其余资源：直接取缓存。脚本样式都带 ?v= 版本号，换了版本就是新地址，
 *          所以缓存不会把旧文件喂给新页面。
 */
const CACHE = 'gk-review-v5';
const PRECACHE = [
  './',
  './index.html',
  './styles.css?v=5',
  './app.js?v=5',
  './data.js?v=5',
  './pomodoro.js?v=5',
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

function offlinePage() {
  const html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>当前离线</title></head>' +
    '<body style="margin:0;display:grid;place-items:center;min-height:100vh;' +
    'background:#F4F1E9;color:#2B4A6B;font:15px/1.8 system-ui,sans-serif">' +
    '<div style="text-align:center;padding:24px">' +
    '<p style="font-size:17px;margin:0 0 6px"><b>现在打不开页面</b></p>' +
    '<p style="margin:0;color:#6b7480">这台设备上还没有存过这个页面，连上网络后刷新一次就好。</p>' +
    '</div></body></html>';
  return new Response(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function networkFirst(req) {
  let cache = null;
  try { cache = await caches.open(CACHE); }
  catch (err) { return fetch(req); }   // 存储不可用（隐私模式等）就别拦这次请求

  try {
    const res = await timeoutFetch(req, 2800);
    if (res && res.status === 200 && res.type === 'basic') {
      cache.put(req, res.clone()).catch(function () {});
      /* 顺手把离线兜底用的那份首页也更新掉，断网打开时不会是旧界面 */
      try {
        cache.put(new URL('./index.html', self.location).href, res.clone()).catch(function () {});
      } catch (e) { /* 忽略 */ }
    }
    return res;
  } catch (err) {
    try {
      const idx = await cache.match('./index.html');
      if (idx) return idx;
    } catch (e) { /* 缓存读不了就往下走 */ }
    return offlinePage();
  }
}

async function cacheFirst(req) {
  let cache = null;
  try { cache = await caches.open(CACHE); }
  catch (err) { return fetch(req); }

  try {
    const hit = await cache.match(req);
    if (hit) return hit;
  } catch (e) { /* 忽略，继续走网络 */ }

  try {
    const res = await fetch(req);
    if (res && res.status === 200 && res.type === 'basic') {
      cache.put(req, res.clone()).catch(function () {});
    }
    return res;
  } catch (err) {
    /* 兜底：地址带了 ?retry= 这类参数时，退回同名文件的缓存 */
    try {
      const loose = await cache.match(req, { ignoreSearch: true });
      if (loose) return loose;
    } catch (e) { /* 忽略 */ }
    return Response.error();
  }
}

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') e.respondWith(networkFirst(req));
  else e.respondWith(cacheFirst(req));
});
