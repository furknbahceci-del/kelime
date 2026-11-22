// Kelime Defterim — çevrimdışı önbellek + günlük hatırlatma
const CACHE = 'kelime-v4';
const FILES = ['./', 'index.html', 'words.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('kelime-v') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Önce ağ (güncellemeler gelsin), ağ yoksa önbellek
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

const dayNum = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5); };
async function remind() {
  const c = await caches.open('kelime-state');
  const r = await c.match('state.json');
  if (!r) return;
  const s = await r.json();
  const t = dayNum(), now = new Date();
  if (s.lastDay >= t || s.notified === t) return;
  if (now.getHours() * 60 + now.getMinutes() < s.remH * 60 + s.remM) return;
  s.notified = t;
  await c.put('state.json', new Response(JSON.stringify(s)));
  await self.registration.showNotification('Kelime zamanı! 📚', {
    body: s.due ? s.due + ' kelime tekrar bekliyor. 5 dakikanı ayır, serini bozma.' : 'Bugünün yeni kelimeleri seni bekliyor.',
    icon: 'icon-192.png', badge: 'icon-192.png', tag: 'gunluk'
  });
}
self.addEventListener('periodicsync', e => { if (e.tag === 'hatirlat') e.waitUntil(remind()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
