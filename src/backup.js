// Copias de seguridad: archivo local (.zip) y Google Drive.
import JSZip from 'jszip';
import { db, getBooks, getFile, kvGet, kvSet } from './db.js';
import { clearCache, getAppSettings } from './store.js';

// ---------------------------------------------------------------------------
// Instantánea de datos (sin los archivos EPUB)
// ---------------------------------------------------------------------------
const blobToDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
const dataUrlToBlob = async (url) => (await fetch(url)).blob();

const KV_KEYS = ['room', 'genres', 'reader', 'app'];

async function snapshot() {
  const d = await db();
  const books = await Promise.all((await getBooks()).map(async (b) => ({ ...b, cover: b.cover ? await blobToDataUrl(b.cover) : null })));
  const kv = {};
  for (const k of KV_KEYS) kv[k] = await d.get('kv', k);
  return { version: 1, app: 'rincon-de-lectura', createdAt: Date.now(), books, days: await d.getAll('days'), kv };
}

async function restoreSnapshot(data, getBookFile) {
  if (data?.app !== 'rincon-de-lectura') throw new Error('Este archivo no es una copia de Rincón de lectura');
  const d = await db();
  const files = {};
  for (const b of data.books) files[b.id] = await getBookFile(b.id);
  const tx = d.transaction(['books', 'files', 'days', 'kv'], 'readwrite');
  await Promise.all([tx.objectStore('books').clear(), tx.objectStore('files').clear(), tx.objectStore('days').clear()]);
  tx.done.catch(() => {});
  await tx.done;
  for (const b of data.books) {
    const book = { ...b, cover: b.cover ? await dataUrlToBlob(b.cover) : null };
    await d.put('books', book);
    if (files[b.id]) await d.put('files', { id: b.id, blob: files[b.id] });
  }
  for (const day of data.days || []) await d.put('days', day);
  for (const [k, v] of Object.entries(data.kv || {})) if (v !== undefined && k !== 'app') await d.put('kv', v, k);
  // Mantener la configuración de Drive de este dispositivo
  const localApp = await getAppSettings();
  if (data.kv?.app) await d.put('kv', { ...data.kv.app, driveClientId: localApp.driveClientId || data.kv.app.driveClientId }, 'app');
  clearCache();
}

// ---------------------------------------------------------------------------
// Copia local
// ---------------------------------------------------------------------------
export async function exportZip(onProgress = () => {}) {
  const zip = new JSZip();
  const snap = await snapshot();
  zip.file('biblioteca.json', JSON.stringify(snap));
  let i = 0;
  for (const b of snap.books) {
    const f = await getFile(b.id);
    if (f) zip.file(`libros/${b.id}.epub`, f);
    onProgress(++i / snap.books.length);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rincon-lectura-copia-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export async function importZip(file) {
  const zip = await JSZip.loadAsync(file);
  const data = JSON.parse(await zip.file('biblioteca.json').async('string'));
  await restoreSnapshot(data, async (id) => {
    const f = zip.file(`libros/${id}.epub`);
    return f ? new Blob([await f.async('blob')], { type: 'application/epub+zip' }) : null;
  });
}

// ---------------------------------------------------------------------------
// Google Drive
// ---------------------------------------------------------------------------
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Rincón de lectura (copia de seguridad)';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

let gisPromise = null;
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return gisPromise ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.onload = res; s.onerror = () => { gisPromise = null; rej(new Error('No se pudo cargar Google (¿sin conexión?)')); };
    document.head.append(s);
  });
}

function cachedToken() {
  try {
    const t = JSON.parse(localStorage.getItem('rincon-drive-token') || 'null');
    if (t && t.exp > Date.now() + 60000) return t.token;
  } catch {}
  return null;
}

export function driveTokenValid() { return !!cachedToken(); }

// Debe llamarse desde un toque del usuario si no hay token válido (Google abre una ventana)
export async function getDriveToken({ interactive = true } = {}) {
  const cached = cachedToken();
  if (cached) return cached;
  if (!interactive) return null;
  const { driveClientId } = await getAppSettings();
  if (!driveClientId) throw new Error('Falta configurar el ID de cliente de Google en Ajustes');
  await loadGis();
  const connected = await kvGet('driveConnected', false);
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: driveClientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        try { localStorage.setItem('rincon-drive-token', JSON.stringify({ token: resp.access_token, exp: Date.now() + (resp.expires_in || 3600) * 1000 })); } catch {}
        kvSet('driveConnected', true, false);
        resolve(resp.access_token);
      },
      error_callback: (err) => reject(new Error(err?.message || 'Se cerró la ventana de Google')),
    });
    client.requestAccessToken({ prompt: connected ? '' : 'consent' });
  });
}

export async function disconnectDrive() {
  const t = cachedToken();
  localStorage.removeItem('rincon-drive-token');
  await kvSet('driveConnected', false, false);
  await kvSet('driveFiles', {}, false);
  await kvSet('driveFolder', null, false);
  if (t && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t, () => {});
}

async function gfetch(token, url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  if (r.status === 401) { localStorage.removeItem('rincon-drive-token'); throw new Error('La sesión de Google caducó. Vuelve a intentarlo.'); }
  if (!r.ok) throw new Error(`Drive respondió ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return r;
}

async function findFolder(token) {
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const r = await (await gfetch(token, `${API}/files?q=${q}&fields=files(id,name)&spaces=drive`)).json();
  return r.files?.[0]?.id || null;
}

async function ensureFolder(token) {
  let id = await kvGet('driveFolder', null);
  if (id) {
    try { const f = await (await gfetch(token, `${API}/files/${id}?fields=id,trashed`)).json(); if (!f.trashed) return id; } catch {}
  }
  id = await findFolder(token);
  if (!id) {
    const r = await (await gfetch(token, `${API}/files?fields=id`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
    })).json();
    id = r.id;
  }
  await kvSet('driveFolder', id, false);
  return id;
}

async function listFolder(token, folder) {
  const out = [];
  let pageToken = '';
  do {
    const q = encodeURIComponent(`'${folder}' in parents and trashed=false`);
    const r = await (await gfetch(token, `${API}/files?q=${q}&fields=nextPageToken,files(id,name,size)&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`)).json();
    out.push(...(r.files || []));
    pageToken = r.nextPageToken || '';
  } while (pageToken);
  return out;
}

// Subida reanudable (sirve para archivos de cualquier tamaño)
async function upload(token, { name, folder, blob, mime, fileId }) {
  const init = await gfetch(token, `${UPLOAD}/files${fileId ? '/' + fileId : ''}?uploadType=resumable&fields=id`, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mime },
    body: JSON.stringify(fileId ? { name } : { name, parents: [folder] }),
  });
  const loc = init.headers.get('Location');
  const r = await fetch(loc, { method: 'PUT', headers: { 'Content-Type': mime }, body: blob });
  if (!r.ok) throw new Error(`Error al subir ${name}`);
  return (await r.json()).id;
}

export async function backupToDrive({ interactive = true, onProgress = () => {} } = {}) {
  const token = await getDriveToken({ interactive });
  if (!token) return false;
  const folder = await ensureFolder(token);
  const remote = await listFolder(token, folder);
  const byName = Object.fromEntries(remote.map((f) => [f.name, f]));
  const books = await getBooks();
  let done = 0;
  // Libros nuevos (los ya subidos no se vuelven a subir)
  for (const b of books) {
    const name = `libro-${b.id}.epub`;
    if (!byName[name]) {
      const blob = await getFile(b.id);
      if (blob) await upload(token, { name, folder, blob, mime: 'application/epub+zip' });
    }
    onProgress(++done / (books.length + 1), `Subiendo libros (${done}/${books.length})`);
  }
  // Libros eliminados
  const ids = new Set(books.map((b) => `libro-${b.id}.epub`));
  for (const f of remote) if (/^libro-.*\.epub$/.test(f.name) && !ids.has(f.name)) await gfetch(token, `${API}/files/${f.id}`, { method: 'DELETE' }).catch(() => {});
  // Datos
  const snap = await snapshot();
  await upload(token, { name: 'biblioteca.json', folder, blob: new Blob([JSON.stringify(snap)], { type: 'application/json' }), mime: 'application/json', fileId: byName['biblioteca.json']?.id });
  onProgress(1, 'Copia completada');
  const now = Date.now();
  await kvSet('lastBackup', now, false);
  try { localStorage.setItem('rincon-backed', String(now)); } catch {}
  return true;
}

export async function driveBackupInfo() {
  const token = await getDriveToken();
  const folder = await findFolder(token);
  if (!folder) return null;
  const files = await listFolder(token, folder);
  const json = files.find((f) => f.name === 'biblioteca.json');
  if (!json) return null;
  const meta = await (await gfetch(token, `${API}/files/${json.id}?fields=modifiedTime`)).json();
  return { folder, files, json, modified: meta.modifiedTime, books: files.filter((f) => f.name.endsWith('.epub')).length };
}

export async function restoreFromDrive(onProgress = () => {}) {
  const token = await getDriveToken();
  const info = await driveBackupInfo();
  if (!info) throw new Error('No hay ninguna copia en tu Google Drive');
  const data = await (await gfetch(token, `${API}/files/${info.json.id}?alt=media`)).json();
  const byName = Object.fromEntries(info.files.map((f) => [f.name, f]));
  let i = 0;
  await restoreSnapshot(data, async (id) => {
    const f = byName[`libro-${id}.epub`];
    onProgress(++i / data.books.length, `Descargando libros (${i}/${data.books.length})`);
    if (!f) return null;
    return new Blob([await (await gfetch(token, `${API}/files/${f.id}?alt=media`)).blob()], { type: 'application/epub+zip' });
  });
  await kvSet('driveFolder', info.folder, false);
  await kvSet('lastBackup', Date.now(), false);
}

export function needsBackup() {
  try {
    const dirty = +localStorage.getItem('rincon-dirty') || 0;
    const backed = +localStorage.getItem('rincon-backed') || 0;
    return dirty > backed;
  } catch { return false; }
}
