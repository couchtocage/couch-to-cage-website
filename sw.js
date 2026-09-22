// CTC: online-first. Never cache authenticated requests, fighter records, uploads, or HTML.
const CACHE='ctc-app-shell-v1';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/offline.html','/assets/app/ctc-192.png','/assets/app/ctc-512.png'])));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ctc-app-shell-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||r.mode!=='navigate'||new URL(r.url).origin!==self.location.origin)return;
// Navigation is ALWAYS fetched fresh; no private/admin page is stored in offline cache.
e.respondWith(fetch(r).catch(async()=>new Response(await (await caches.open(CACHE)).match('/offline.html').then(x=>x.text()),{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
