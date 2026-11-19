importScripts('./download-manifest.js');

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

let active = 0;
const waiting = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function fetchPart(id) {
  if (active >= 8) await new Promise(resolve => waiting.push(resolve));
  else active++;
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      try {
        const response = await fetch('./download-parts/' + id + '.bin', {signal: controller.signal});
        if (!response.ok) throw Error('Download failed: ' + response.status);
        const bytes = await response.arrayBuffer();
        const hash = await digest(bytes);
        if (!hash.startsWith(id)) throw Error('Download was incomplete');
        return bytes;
      } catch (err) {
        if (attempt === 3) throw err;
        await sleep(300 * (attempt + 1));
      } finally { clearTimeout(timer); }
    }
  } finally {
    const next = waiting.shift();
    if (next) next(); else active--;
  }
}
async function digest(bytes) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
}
async function assemble(request, asset) {
  let cache;
  const key = new URL('./_verified/' + asset.sha, self.location.href).href;
  try {
    cache = await caches.open('word-defense-verified-v1');
    const saved = await cache.match(key);
    if (saved) return saved;
  } catch {}
  const parts = await Promise.all(asset.chunks.map(fetchPart));
  const blob = new Blob(parts);
  const bytes = asset.compressed
    ? await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
    : await blob.arrayBuffer();
  if (await digest(bytes) !== asset.sha) throw Error('File verification failed');
  const result = new Response(bytes, {headers:{'Content-Type':asset.type,'Content-Length':String(bytes.byteLength)}});
  try { if (cache) await cache.put(key, result.clone()); } catch {}
  return result;
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const asset = gameAssets[url.pathname];
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !asset || event.request.headers.has('Range')) return;
  if (asset.compressed && typeof DecompressionStream === 'undefined') return;
  event.respondWith(assemble(event.request, asset).catch(() => fetch(event.request)));
});
