/**
 * Host-agnostic cache for /data/*.json (10 min TTL).
 * Complements Cache-Control headers on Vercel / compatible hosts.
 */
const CACHE_NAME = "powder-data-v2";
const DATA_TTL_MS = 10 * 60 * 1000;

function isDataJsonRequest(url) {
  try {
    const u = new URL(url);
    return u.pathname.includes("/data/") && u.pathname.endsWith(".json");
  } catch (_e) {
    return false;
  }
}

self.addEventListener("install", function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    (async function () {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(function (k) {
          return k.startsWith("powder-data-") && k !== CACHE_NAME;
        }).map(function (k) {
          return caches.delete(k);
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET" || !isDataJsonRequest(event.request.url)) return;
  event.respondWith(staleWhileRevalidateData(event.request));
});

async function staleWhileRevalidateData(request) {
  const cache = await caches.open(CACHE_NAME);
  const metaKey = request.url + "::meta";
  const cached = await cache.match(request);
  const metaRes = await cache.match(metaKey);
  let cachedAt = 0;
  if (metaRes) {
    try {
      const meta = await metaRes.json();
      cachedAt = meta && meta.t ? meta.t : 0;
    } catch (_e) {}
  }

  const networkPromise = fetch(request)
    .then(function (res) {
      if (res && res.ok) {
        cache.put(request, res.clone());
        cache.put(
          metaKey,
          new Response(JSON.stringify({ t: Date.now() }), {
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      return res;
    })
    .catch(function () {
      return null;
    });

  if (cached && cachedAt && Date.now() - cachedAt < DATA_TTL_MS) {
    networkPromise.catch(function () {});
    return cached;
  }

  const net = await networkPromise;
  if (net) return net;
  if (cached) return cached;
  return fetch(request);
}
