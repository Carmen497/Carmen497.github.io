import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { putInbox } from './db.js';

// Recibir archivos compartidos desde otras apps (Telegram, Archivos...)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(handleShare(event.request));
  }
});

async function handleShare(request) {
  try {
    const form = await request.formData();
    const files = form.getAll('books').filter((f) => f && typeof f === 'object' && f.size > 0);
    for (const f of files) {
      await putInbox({ id: crypto.randomUUID(), name: f.name || 'libro', type: f.type || '', blob: f, at: Date.now() });
    }
  } catch (e) {
    console.error('share-target', e);
  }
  const base = new URL('./', self.registration.scope).href;
  return Response.redirect(base + '?compartido=1', 303);
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST, { ignoreURLParametersMatching: [/.*/] });
cleanupOutdatedCaches();
